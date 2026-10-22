import type { GameLanguage } from "./localization";

export type ProfileTextKey =
  | "title" | "stats" | "highestLevel" | "totalStars" | "levelRank"
  | "avatar" | "frame" | "unlockLevel" | "locked" | "retry" | "save"
  | "loading" | "renameTitle" | "namePlaceholder" | "rename"
  | "copySuccess" | "copyFailed" | "renameDifferent" | "notEnoughCoins"
  | "appearanceLocked" | "saveUnknown" | "saveSuccess" | "artRetry";

type ProfileText = Record<ProfileTextKey, string>;

const PROFILE_TEXT: Record<GameLanguage, ProfileText> = {
  "zh-CN": {
    title: "个人资料", stats: "总体统计", highestLevel: "最高关卡", totalStars: "总星级", levelRank: "关卡排名",
    avatar: "头像", frame: "头像框", unlockLevel: "通过{level}关解锁", locked: "尚未解锁", retry: "重试", save: "保存",
    loading: "正在加载…", renameTitle: "修改昵称", namePlaceholder: "请输入你的昵称", rename: "改名",
    copySuccess: "ID已复制", copyFailed: "复制失败", renameDifferent: "请输入不同的昵称", notEnoughCoins: "金币不足",
    appearanceLocked: "该外观尚未解锁", saveUnknown: "保存未确认，请重试", saveSuccess: "保存成功", artRetry: "点击重试加载",
  },
  "zh-TW": {
    title: "個人資料", stats: "總體統計", highestLevel: "最高關卡", totalStars: "總星級", levelRank: "關卡排名",
    avatar: "頭像", frame: "頭像框", unlockLevel: "通過{level}關解鎖", locked: "尚未解鎖", retry: "重試", save: "儲存",
    loading: "正在載入…", renameTitle: "修改暱稱", namePlaceholder: "請輸入你的暱稱", rename: "改名",
    copySuccess: "ID已複製", copyFailed: "複製失敗", renameDifferent: "請輸入不同的暱稱", notEnoughCoins: "金幣不足",
    appearanceLocked: "該外觀尚未解鎖", saveUnknown: "儲存未確認，請重試", saveSuccess: "儲存成功", artRetry: "點擊重試載入",
  },
  en: {
    title: "PROFILE", stats: "General Stats", highestLevel: "Highest Level", totalStars: "Total Stars", levelRank: "Level Rank",
    avatar: "Avatar", frame: "Frame", unlockLevel: "Complete level {level} to unlock", locked: "Locked", retry: "Retry", save: "Save",
    loading: "Loading…", renameTitle: "RENAME", namePlaceholder: "Enter your name", rename: "Rename",
    copySuccess: "ID copied", copyFailed: "Unable to copy", renameDifferent: "Enter a different name", notEnoughCoins: "Not enough coins",
    appearanceLocked: "Appearance is locked", saveUnknown: "Save unconfirmed. Tap to retry", saveSuccess: "Saved successfully", artRetry: "Tap to retry loading",
  },
  ja: {
    title: "プロフィール", stats: "総合統計", highestLevel: "最高レベル", totalStars: "合計スター", levelRank: "レベル順位",
    avatar: "アバター", frame: "フレーム", unlockLevel: "レベル{level}クリアで解放", locked: "未解放", retry: "再試行", save: "保存",
    loading: "読み込み中…", renameTitle: "ニックネーム変更", namePlaceholder: "名前を入力", rename: "変更",
    copySuccess: "IDをコピーしました", copyFailed: "コピーできません", renameDifferent: "別の名前を入力してください", notEnoughCoins: "コインが足りません",
    appearanceLocked: "この外観は未解放です", saveUnknown: "保存を確認できません。再試行してください", saveSuccess: "保存しました", artRetry: "タップして再読み込み",
  },
  ko: {
    title: "프로필", stats: "종합 통계", highestLevel: "최고 레벨", totalStars: "총 별", levelRank: "레벨 순위",
    avatar: "아바타", frame: "프레임", unlockLevel: "레벨 {level} 완료 시 해금", locked: "잠김", retry: "다시 시도", save: "저장",
    loading: "불러오는 중…", renameTitle: "닉네임 변경", namePlaceholder: "이름을 입력하세요", rename: "변경",
    copySuccess: "ID가 복사되었습니다", copyFailed: "복사할 수 없습니다", renameDifferent: "다른 이름을 입력하세요", notEnoughCoins: "코인이 부족합니다",
    appearanceLocked: "이 외형은 잠겨 있습니다", saveUnknown: "저장이 확인되지 않았습니다. 다시 시도하세요", saveSuccess: "저장됨", artRetry: "탭하여 다시 로드",
  },
  es: {
    title: "Perfil", stats: "Estadísticas generales", highestLevel: "Nivel máximo", totalStars: "Estrellas totales", levelRank: "Rango por nivel",
    avatar: "Avatar", frame: "Marco", unlockLevel: "Completa el nivel {level} para desbloquear", locked: "Bloqueado", retry: "Reintentar", save: "Guardar",
    loading: "Cargando…", renameTitle: "CAMBIAR NOMBRE", namePlaceholder: "Introduce tu nombre", rename: "Cambiar",
    copySuccess: "ID copiado", copyFailed: "No se pudo copiar", renameDifferent: "Introduce otro nombre", notEnoughCoins: "No hay suficientes monedas",
    appearanceLocked: "Apariencia bloqueada", saveUnknown: "Guardado no confirmado. Toca para reintentar", saveSuccess: "Guardado", artRetry: "Toca para volver a cargar",
  },
  pt: {
    title: "Perfil", stats: "Estatísticas gerais", highestLevel: "Maior nível", totalStars: "Estrelas totais", levelRank: "Classificação por nível",
    avatar: "Avatar", frame: "Moldura", unlockLevel: "Conclua o nível {level} para desbloquear", locked: "Bloqueado", retry: "Tentar novamente", save: "Salvar",
    loading: "Carregando…", renameTitle: "ALTERAR NOME", namePlaceholder: "Digite seu nome", rename: "Alterar",
    copySuccess: "ID copiado", copyFailed: "Não foi possível copiar", renameDifferent: "Digite outro nome", notEnoughCoins: "Moedas insuficientes",
    appearanceLocked: "Aparência bloqueada", saveUnknown: "Salvamento não confirmado. Toque para tentar novamente", saveSuccess: "Salvo", artRetry: "Toque para recarregar",
  },
  fr: {
    title: "Profil", stats: "Statistiques générales", highestLevel: "Niveau max.", totalStars: "Étoiles totales", levelRank: "Classement de niveau",
    avatar: "Avatar", frame: "Cadre", unlockLevel: "Terminez le niveau {level} pour débloquer", locked: "Verrouillé", retry: "Réessayer", save: "Enregistrer",
    loading: "Chargement…", renameTitle: "MODIFIER LE NOM", namePlaceholder: "Saisissez votre nom", rename: "Modifier",
    copySuccess: "ID copié", copyFailed: "Copie impossible", renameDifferent: "Saisissez un autre nom", notEnoughCoins: "Pièces insuffisantes",
    appearanceLocked: "Apparence verrouillée", saveUnknown: "Enregistrement non confirmé. Touchez pour réessayer", saveSuccess: "Enregistré", artRetry: "Touchez pour recharger",
  },
  de: {
    title: "Profil", stats: "Gesamtstatistik", highestLevel: "Höchstes Level", totalStars: "Gesamtsterne", levelRank: "Levelrang",
    avatar: "Avatar", frame: "Rahmen", unlockLevel: "Schließe Level {level} ab, um freizuschalten", locked: "Gesperrt", retry: "Erneut versuchen", save: "Speichern",
    loading: "Wird geladen…", renameTitle: "NAMEN ÄNDERN", namePlaceholder: "Namen eingeben", rename: "Ändern",
    copySuccess: "ID kopiert", copyFailed: "Kopieren nicht möglich", renameDifferent: "Anderen Namen eingeben", notEnoughCoins: "Nicht genügend Münzen",
    appearanceLocked: "Erscheinungsbild gesperrt", saveUnknown: "Speichern nicht bestätigt. Zum Wiederholen tippen", saveSuccess: "Gespeichert", artRetry: "Zum Neuladen tippen",
  },
  ru: {
    title: "Профиль", stats: "Общая статистика", highestLevel: "Максимальный уровень", totalStars: "Всего звёзд", levelRank: "Место по уровню",
    avatar: "Аватар", frame: "Рамка", unlockLevel: "Пройдите уровень {level}, чтобы открыть", locked: "Заблокировано", retry: "Повторить", save: "Сохранить",
    loading: "Загрузка…", renameTitle: "ИЗМЕНИТЬ ИМЯ", namePlaceholder: "Введите имя", rename: "Изменить",
    copySuccess: "ID скопирован", copyFailed: "Не удалось скопировать", renameDifferent: "Введите другое имя", notEnoughCoins: "Недостаточно монет",
    appearanceLocked: "Внешний вид заблокирован", saveUnknown: "Сохранение не подтверждено. Нажмите, чтобы повторить", saveSuccess: "Сохранено", artRetry: "Нажмите для повторной загрузки",
  },
};

export function profileText(language: GameLanguage | undefined, key: ProfileTextKey, params: { level?: number } = {}): string {
  const value = (PROFILE_TEXT[language ?? "zh-CN"] ?? PROFILE_TEXT["zh-CN"])[key];
  return value.replace("{level}", params.level == null ? "" : String(params.level));
}
