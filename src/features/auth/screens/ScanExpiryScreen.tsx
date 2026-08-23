import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { extractExpiryDate } from '../../../api/ocr';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';
import {
  runOcr,
  prepareImage,
  OcrError,
  activeProviderName,
  type GuideBoxRect,
} from './components/ocr';
import type { OcrConfidence, OcrExtractResponse, OcrSource } from '../../../types';

const theme = {
  background: '#F9F8F4',
  card: '#FFFFFF',
  primary: '#24211D',
  textLight: '#A39C93',
  textDark: '#24211D',
  border: '#E8E6E1',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  success: '#10B981',
  successBg: '#E6F4EA',
};

/** สัดส่วนกรอบเล็งเทียบกับพื้นที่ preview ของกล้อง */
const GUIDE_BOX = { widthRatio: 0.86, heightRatio: 0.2, topRatio: 0.38 };

const CONFIDENCE_STYLE: Record<OcrConfidence, { color: string; bg: string; label: string }> = {
  HIGH: { color: theme.success, bg: theme.successBg, label: 'อ่านได้ชัดเจน' },
  MEDIUM: { color: theme.warning, bg: theme.warningBg, label: 'ควรตรวจสอบก่อนใช้' },
  LOW: { color: theme.danger, bg: theme.dangerBg, label: 'อ่านวันที่ไม่ได้' },
};

type Phase = 'camera' | 'processing' | 'result';

export default function ScanExpiryScreen({ navigation }: any) {
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('camera');
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<OcrExtractResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  const guideBox = computeGuideBox(previewSize);

  /** ขั้นตอนร่วมของทั้งกล้องและคลังภาพ: เตรียมรูป → OCR → ส่งข้อความให้ backend หาวันที่ */
  const processImage = async (
    photo: { uri: string; width: number; height: number },
    source: OcrSource,
    box?: GuideBoxRect
  ) => {
    if (!user?.restaurantId) {
      setPhase('result');
      setErrorText('ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');
      return;
    }

    setPhase('processing');
    setErrorText(null);
    setResult(null);
    setShowRawText(false);
    setPhotoUri(photo.uri);

    try {
      setStatusText('กำลังเตรียมรูป...');
      const image = await prepareImage(photo, box ? previewSize : undefined, box);

      setStatusText('กำลังอ่านตัวอักษรจากฉลาก...');
      const rawText = await runOcr(image);

      // OCR ได้ค่าว่าง = ยิง API ไปก็โดน 400 (rawText: must not be blank) จึงหยุดตรงนี้
      if (!rawText.trim()) {
        setPhase('result');
        setErrorText('อ่านตัวอักษรจากรูปไม่ได้เลย กรุณาถ่ายใหม่ให้ชัดขึ้นและมีแสงพอ');
        return;
      }

      setStatusText('กำลังวิเคราะห์วันหมดอายุ...');
      const { data } = await extractExpiryDate(user.restaurantId, rawText, source);

      setResult(data);
      setPhase('result');
    } catch (error: any) {
      setPhase('result');
      setErrorText(toMessage(error));
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) throw new Error('no photo');
      await processImage(photo, 'CAMERA', guideBox ?? undefined);
    } catch (error: any) {
      setPhase('result');
      setErrorText(toMessage(error));
    }
  };

  const handlePickFromGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    // รูปจากคลังภาพไม่มีกรอบเล็งให้อ้างอิง จึงส่งเข้า OCR ทั้งรูป
    await processImage(
      { uri: asset.uri, width: asset.width, height: asset.height },
      'GALLERY'
    );
  };

  const handleRetake = () => {
    setPhase('camera');
    setResult(null);
    setErrorText(null);
    setPhotoUri(null);
  };

  /** ส่งวันที่กลับไปเติมในฟอร์มเพิ่มวัตถุดิบ — ไม่บันทึกลง database ที่หน้านี้ */
  const handleConfirm = () => {
    if (!result?.expiryDate) return;
    navigation.navigate('AddIngredient', { ocrResult: result });
  };

  /* ---------- ยังไม่ได้สิทธิ์กล้อง ---------- */
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Feather name="camera-off" size={40} color={theme.textLight} />
        <Text style={styles.permissionTitle}>ต้องอนุญาตให้ใช้กล้องก่อน</Text>
        <Text style={styles.permissionBody}>
          แอปใช้กล้องเพื่อถ่ายฉลากสินค้าและอ่านวันหมดอายุให้อัตโนมัติ
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
        >
          <Text style={styles.primaryButtonText}>
            {permission.canAskAgain ? 'อนุญาตใช้กล้อง' : 'ไปที่ตั้งค่า'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkButtonText}>กรอกวันหมดอายุเอง</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- หน้ากล้อง ---------- */
  if (phase === 'camera') {
    return (
      <View style={styles.cameraRoot}>
        <View
          style={styles.cameraFill}
          onLayout={(e) => setPreviewSize(e.nativeEvent.layout)}
        >
          <CameraView
            ref={cameraRef}
            style={styles.cameraFill}
            facing="back"
            onCameraReady={() => setIsCameraReady(true)}
          />

          {guideBox && (
            <>
              {/* ฉากทึบรอบกรอบเล็ง เพื่อบอกว่าจะ crop เฉพาะตรงกลาง */}
              <View style={[styles.mask, { height: guideBox.y }]} />
              <View
                style={[
                  styles.mask,
                  { top: guideBox.y + guideBox.height, bottom: 0, height: undefined },
                ]}
              />
              <View
                style={[
                  styles.guideFrame,
                  {
                    top: guideBox.y,
                    left: guideBox.x,
                    width: guideBox.width,
                    height: guideBox.height,
                  },
                ]}
              />
              <Text style={[styles.guideHint, { top: guideBox.y + guideBox.height + 16 }]}>
                เล็งให้เห็นคำว่า EXP และวันที่อยู่ในกรอบ
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Feather name="x" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={handlePickFromGallery}>
            <Feather name="image" size={22} color="#FFF" />
            <Text style={styles.galleryText}>คลังภาพ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shutter, !isCameraReady && { opacity: 0.4 }]}
            onPress={handleCapture}
            disabled={!isCameraReady}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <View style={styles.galleryButton} />
        </View>
      </View>
    );
  }

  /* ---------- กำลังประมวลผล ---------- */
  if (phase === 'processing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.processingText}>{statusText}</Text>
        <Text style={styles.providerText}>ใช้ OCR: {activeProviderName}</Text>
      </View>
    );
  }

  /* ---------- หน้าแสดงผล ---------- */
  const confidence = result ? CONFIDENCE_STYLE[result.confidence] : null;

  return (
    <View style={styles.resultRoot}>
      <View style={styles.resultHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Feather name="arrow-left" size={22} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ผลการสแกน</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.resultContent}>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />}

        {errorText && (
          <View style={[styles.banner, { backgroundColor: theme.dangerBg }]}>
            <Feather name="alert-circle" size={18} color={theme.danger} />
            <Text style={[styles.bannerText, { color: theme.danger }]}>{errorText}</Text>
          </View>
        )}

        {result && confidence && (
          <>
            <View style={[styles.badge, { backgroundColor: confidence.bg }]}>
              <View style={[styles.badgeDot, { backgroundColor: confidence.color }]} />
              <Text style={[styles.badgeText, { color: confidence.color }]}>{confidence.label}</Text>
            </View>

            {result.expiryDate ? (
              <View style={styles.readingCard}>
                <Text style={styles.readingLabel}>อ่านจากฉลากได้ว่า</Text>
                <Text style={styles.matchedText}>{result.matchedText ?? '-'}</Text>
                <Feather name="arrow-down" size={18} color={theme.textLight} />
                <Text style={styles.readingLabel}>ตีความเป็นวันหมดอายุ</Text>
                <Text style={styles.expiryText}>{formatThaiDate(result.expiryDate)}</Text>
                <Text style={styles.isoText}>{result.expiryDate}</Text>
                <Text style={styles.confirmHint}>ถูกต้องหรือไม่? กรุณาตรวจสอบกับฉลากจริงก่อนใช้</Text>
              </View>
            ) : (
              <View style={styles.readingCard}>
                <Text style={styles.readingLabel}>ไม่พบวันหมดอายุในรูปนี้</Text>
                <Text style={styles.confirmHint}>
                  ลองถ่ายใหม่ให้เห็นวันที่ชัดๆ หรือกรอกวันหมดอายุเองก็ได้
                </Text>
              </View>
            )}

            {result.warnings.map((warning, i) => (
              <View key={i} style={[styles.banner, { backgroundColor: theme.warningBg }]}>
                <Feather name="alert-triangle" size={18} color={theme.warning} />
                <Text style={[styles.bannerText, { color: theme.warning }]}>{warning}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.rawToggle}
              onPress={() => setShowRawText((prev) => !prev)}
            >
              <Feather
                name={showRawText ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.textLight}
              />
              <Text style={styles.rawToggleText}>ดูข้อความที่อ่านได้ทั้งหมด</Text>
            </TouchableOpacity>
            {showRawText && (
              <View style={styles.rawBox}>
                <Text style={styles.rawText}>{result.rawText}</Text>
                <Text style={styles.providerText}>ใช้ OCR: {activeProviderName}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
          <Feather name="refresh-cw" size={16} color={theme.textDark} />
          <Text style={styles.secondaryButtonText}>ถ่ายใหม่</Text>
        </TouchableOpacity>

        {result?.expiryDate ? (
          <TouchableOpacity style={styles.primaryButtonFlex} onPress={handleConfirm}>
            <Text style={styles.primaryButtonText}>ใช้วันที่นี้</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButtonFlex} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>กรอกเอง</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/** คำนวณกรอบเล็งจากขนาด preview จริงที่วัดได้ */
function computeGuideBox(preview: { width: number; height: number }): GuideBoxRect | null {
  if (!preview.width || !preview.height) return null;
  const width = preview.width * GUIDE_BOX.widthRatio;
  const height = preview.height * GUIDE_BOX.heightRatio;
  return {
    x: (preview.width - width) / 2,
    y: preview.height * GUIDE_BOX.topRatio,
    width,
    height,
  };
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** '2026-08-09' -> '9 ส.ค. 2026' (แสดงปี ค.ศ. ให้ตรงกับที่ backend เก็บ) */
function formatThaiDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${THAI_MONTHS[month - 1]} ${year}`;
}

/** แปลง error ให้เป็นข้อความที่ผู้ใช้อ่านรู้เรื่อง */
function toMessage(error: any): string {
  if (error instanceof OcrError) return error.message;

  // 403 = backend ปฏิเสธสิทธิ์ ไม่ใช่ปัญหาข้อมูลที่ส่งไป (ปกติคือ endpoint ยังไม่ถูกเปิดใน SecurityConfig)
  if (error?.response?.status === 403) {
    return 'ไม่ได้รับอนุญาตให้ใช้ระบบสแกน (403) — ฝั่ง backend ยังไม่ได้เปิดสิทธิ์ให้ /api/ocr';
  }

  const apiMessage: string | undefined = error?.response?.data?.message;
  if (apiMessage) {
    if (apiMessage.includes('not assigned to any restaurant')) {
      return 'บัญชีนี้ยังไม่ได้ผูกกับร้าน กรุณาติดต่อผู้จัดการร้าน';
    }
    if (apiMessage.includes('Unauthorized to access this restaurant')) {
      return 'ไม่มีสิทธิ์เข้าถึงข้อมูลร้านนี้ กรุณาล็อกอินใหม่';
    }
    return apiMessage;
  }

  console.warn('[ScanExpiry]', error);
  return 'เกิดข้อผิดพลาดในการสแกน กรุณาลองใหม่อีกครั้ง';
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  processingText: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark, marginTop: 8 },
  providerText: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textLight },

  permissionTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },
  permissionBody: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },

  cameraRoot: { flex: 1, backgroundColor: '#000' },
  cameraFill: { flex: 1 },
  mask: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  guideFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
  },
  guideHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFF',
    fontFamily: FONT_REGULAR,
    fontSize: 13,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  galleryButton: { alignItems: 'center', gap: 4, width: 72 },
  galleryText: { color: '#FFF', fontFamily: FONT_REGULAR, fontSize: 12 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF' },

  resultRoot: { flex: 1, backgroundColor: theme.background },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },
  resultContent: { padding: 24, gap: 16 },
  photo: { width: '100%', height: 160, borderRadius: 16, backgroundColor: theme.border },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontFamily: FONT_BOLD, fontSize: 13 },

  readingCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  readingLabel: { fontFamily: FONT_REGULAR, fontSize: 13, color: theme.textLight },
  matchedText: { fontFamily: FONT_BOLD, fontSize: 22, color: theme.textDark, letterSpacing: 1 },
  expiryText: { fontFamily: FONT_BOLD, fontSize: 26, color: theme.textDark },
  isoText: { fontFamily: FONT_REGULAR, fontSize: 13, color: theme.textLight },
  confirmHint: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: theme.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  bannerText: { flex: 1, fontFamily: FONT_REGULAR, fontSize: 13, lineHeight: 20 },

  rawToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  rawToggleText: { fontFamily: FONT_REGULAR, fontSize: 13, color: theme.textLight },
  rawBox: {
    backgroundColor: '#F1EFEA',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  rawText: { fontFamily: FONT_REGULAR, fontSize: 13, color: theme.textDark, lineHeight: 20 },

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.card,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonFlex: {
    flex: 1,
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: FONT_BOLD, fontSize: 15, color: '#FFF' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryButtonText: { fontFamily: FONT_BOLD, fontSize: 15, color: theme.textDark },
  linkButton: { paddingVertical: 8 },
  linkButtonText: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight },
});
