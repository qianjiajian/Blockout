import type { DailyTaskId } from "../core/dailyTasks";
import type { GameLanguage } from "./localization";

export type DailyTaskTextKey =
  | "entry" | "title" | "summary" | "resetsIn"
  | "claim" | "claimed" | "incomplete" | "reward"
  | "bonusTitle" | "bonusDescription" | "bonusOpen" | "bonusClaimed"
  | "claimSuccess" | "claimFailed" | "claimUnknown" | "coinsFull"
  | `task.${DailyTaskId}.title`
  | `task.${DailyTaskId}.description`;

type Dictionary = Readonly<Record<DailyTaskTextKey, string>>;

const en: Dictionary = {
  entry: "Daily", title: "Daily Tasks", summary: "Today's progress  {completed}/{total}", resetsIn: "Refreshes in {time}",
  claim: "Claim", claimed: "Claimed", incomplete: "Go", reward: "+{amount}",
  bonusTitle: "Daily Bonus", bonusDescription: "Complete all 3 tasks", bonusOpen: "Open", bonusClaimed: "Opened",
  claimSuccess: "Reward claimed +{amount}", claimFailed: "Could not claim. Try again.", claimUnknown: "Save status unknown. Tap again to confirm.", coinsFull: "Coin storage is full.",
  "task.clear-levels.title": "Clear Levels", "task.clear-levels.description": "Complete {target} levels",
  "task.earn-stars.title": "Collect Stars", "task.earn-stars.description": "Earn {target} stars",
  "task.perfect-clear.title": "Perfect Clear", "task.perfect-clear.description": "Get 3 stars {target} time",
  "task.booster-free.title": "Pure Skill", "task.booster-free.description": "Clear {target} levels without boosters",
  "task.use-booster.title": "Power Up", "task.use-booster.description": "Use {target} booster in a clear",
};

const zhCN: Dictionary = {
  entry: "每日任务", title: "每日任务", summary: "今日进度  {completed}/{total}", resetsIn: "{time} 后刷新",
  claim: "领取", claimed: "已完成", incomplete: "去完成", reward: "+{amount}",
  bonusTitle: "每日宝箱", bonusDescription: "完成全部 3 个任务", bonusOpen: "开启", bonusClaimed: "已开启",
  claimSuccess: "领取成功 +{amount}", claimFailed: "领取失败，请重试。", claimUnknown: "存档状态未知，请再次点击确认。", coinsFull: "金币已满，请先使用金币。",
  "task.clear-levels.title": "闯关达人", "task.clear-levels.description": "完成 {target} 个关卡",
  "task.earn-stars.title": "星星收集", "task.earn-stars.description": "累计获得 {target} 颗星",
  "task.perfect-clear.title": "完美通关", "task.perfect-clear.description": "获得 {target} 次三星通关",
  "task.booster-free.title": "纯粹技巧", "task.booster-free.description": "不用道具完成 {target} 关",
  "task.use-booster.title": "道具助力", "task.use-booster.description": "在通关中使用 {target} 个道具",
};

const dictionaries: Readonly<Record<GameLanguage, Dictionary>> = {
  "zh-CN": zhCN,
  "zh-TW": { ...zhCN, entry: "每日任務", title: "每日任務", summary: "今日進度  {completed}/{total}", resetsIn: "{time} 後更新", claim: "領取", claimed: "已領取", incomplete: "去完成", bonusTitle: "每日寶箱", bonusDescription: "完成全部 3 個任務", bonusOpen: "開啟", bonusClaimed: "已開啟", claimSuccess: "領取成功 +{amount}", claimFailed: "領取失敗，請重試。", claimUnknown: "存檔狀態未知，請再次點擊確認。", coinsFull: "金幣已滿，請先使用金幣。", "task.clear-levels.title": "闖關達人", "task.clear-levels.description": "完成 {target} 個關卡", "task.earn-stars.title": "星星收集", "task.earn-stars.description": "累計獲得 {target} 顆星", "task.perfect-clear.title": "完美通關", "task.perfect-clear.description": "獲得 {target} 次三星通關", "task.booster-free.title": "純粹技巧", "task.booster-free.description": "不用道具完成 {target} 關", "task.use-booster.title": "道具助力", "task.use-booster.description": "在通關中使用 {target} 個道具" },
  en,
  ja: { ...en, entry: "デイリー", title: "デイリーミッション", summary: "今日の進捗  {completed}/{total}", resetsIn: "あと {time} で更新", claim: "受取", claimed: "受取済", incomplete: "挑戦", bonusTitle: "デイリーボーナス", bonusDescription: "3つのミッションを完了", bonusOpen: "開ける", bonusClaimed: "開封済", claimSuccess: "報酬を受け取りました +{amount}", claimFailed: "受け取れませんでした。もう一度お試しください。", claimUnknown: "保存状態を確認できません。もう一度タップしてください。", coinsFull: "コインが上限に達しています。", "task.clear-levels.title": "ステージクリア", "task.clear-levels.description": "{target}ステージをクリア", "task.earn-stars.title": "スター集め", "task.earn-stars.description": "スターを{target}個獲得", "task.perfect-clear.title": "パーフェクト", "task.perfect-clear.description": "3つ星を{target}回達成", "task.booster-free.title": "実力勝負", "task.booster-free.description": "ブースターなしで{target}回クリア", "task.use-booster.title": "パワーアップ", "task.use-booster.description": "クリア時にブースターを{target}個使用" },
  ko: { ...en, entry: "일일", title: "일일 미션", summary: "오늘의 진행도  {completed}/{total}", resetsIn: "{time} 후 갱신", claim: "받기", claimed: "받음", incomplete: "도전", bonusTitle: "일일 보너스", bonusDescription: "미션 3개 모두 완료", bonusOpen: "열기", bonusClaimed: "열림", claimSuccess: "보상을 받았습니다 +{amount}", claimFailed: "보상을 받을 수 없습니다. 다시 시도하세요.", claimUnknown: "저장 상태를 확인할 수 없습니다. 다시 눌러 확인하세요.", coinsFull: "코인이 가득 찼습니다.", "task.clear-levels.title": "스테이지 클리어", "task.clear-levels.description": "스테이지 {target}개 완료", "task.earn-stars.title": "별 수집", "task.earn-stars.description": "별 {target}개 획득", "task.perfect-clear.title": "퍼펙트", "task.perfect-clear.description": "별 3개를 {target}회 달성", "task.booster-free.title": "순수 실력", "task.booster-free.description": "부스터 없이 {target}회 완료", "task.use-booster.title": "파워 업", "task.use-booster.description": "완료 중 부스터 {target}개 사용" },
  es: { ...en, entry: "Diarias", title: "Misiones diarias", summary: "Progreso de hoy  {completed}/{total}", resetsIn: "Se renueva en {time}", claim: "Recoger", claimed: "Recogida", incomplete: "Ir", bonusTitle: "Bonus diario", bonusDescription: "Completa las 3 misiones", bonusOpen: "Abrir", bonusClaimed: "Abierto", claimSuccess: "Recompensa recibida +{amount}", claimFailed: "No se pudo recoger. Inténtalo de nuevo.", claimUnknown: "Estado de guardado desconocido. Toca de nuevo para confirmar.", coinsFull: "El almacén de monedas está lleno.", "task.clear-levels.title": "Supera niveles", "task.clear-levels.description": "Completa {target} niveles", "task.earn-stars.title": "Reúne estrellas", "task.earn-stars.description": "Consigue {target} estrellas", "task.perfect-clear.title": "Victoria perfecta", "task.perfect-clear.description": "Logra 3 estrellas {target} vez", "task.booster-free.title": "Habilidad pura", "task.booster-free.description": "Supera {target} niveles sin ayudas", "task.use-booster.title": "Poténciate", "task.use-booster.description": "Usa {target} ayuda al superar un nivel" },
  pt: { ...en, entry: "Diárias", title: "Missões diárias", summary: "Progresso de hoje  {completed}/{total}", resetsIn: "Renova em {time}", claim: "Coletar", claimed: "Coletado", incomplete: "Jogar", bonusTitle: "Bônus diário", bonusDescription: "Conclua as 3 missões", bonusOpen: "Abrir", bonusClaimed: "Aberto", claimSuccess: "Recompensa coletada +{amount}", claimFailed: "Não foi possível coletar. Tente novamente.", claimUnknown: "Status do salvamento desconhecido. Toque novamente para confirmar.", coinsFull: "O limite de moedas foi atingido.", "task.clear-levels.title": "Conclua fases", "task.clear-levels.description": "Conclua {target} fases", "task.earn-stars.title": "Colete estrelas", "task.earn-stars.description": "Ganhe {target} estrelas", "task.perfect-clear.title": "Vitória perfeita", "task.perfect-clear.description": "Ganhe 3 estrelas {target} vez", "task.booster-free.title": "Habilidade pura", "task.booster-free.description": "Conclua {target} fases sem itens", "task.use-booster.title": "Potência extra", "task.use-booster.description": "Use {target} item em uma vitória" },
  fr: { ...en, entry: "Quotidien", title: "Missions du jour", summary: "Progrès du jour  {completed}/{total}", resetsIn: "Actualisation dans {time}", claim: "Récupérer", claimed: "Récupéré", incomplete: "Jouer", bonusTitle: "Bonus quotidien", bonusDescription: "Terminez les 3 missions", bonusOpen: "Ouvrir", bonusClaimed: "Ouvert", claimSuccess: "Récompense récupérée +{amount}", claimFailed: "Impossible de récupérer. Réessayez.", claimUnknown: "État de sauvegarde inconnu. Touchez à nouveau pour confirmer.", coinsFull: "Le stock de pièces est plein.", "task.clear-levels.title": "Niveaux terminés", "task.clear-levels.description": "Terminez {target} niveaux", "task.earn-stars.title": "Étoiles", "task.earn-stars.description": "Gagnez {target} étoiles", "task.perfect-clear.title": "Victoire parfaite", "task.perfect-clear.description": "Obtenez 3 étoiles {target} fois", "task.booster-free.title": "Talent pur", "task.booster-free.description": "Terminez {target} niveaux sans bonus", "task.use-booster.title": "Coup de pouce", "task.use-booster.description": "Utilisez {target} bonus lors d’une victoire" },
  de: { ...en, entry: "Täglich", title: "Tagesaufgaben", summary: "Heutiger Fortschritt  {completed}/{total}", resetsIn: "Aktualisierung in {time}", claim: "Holen", claimed: "Erhalten", incomplete: "Los", bonusTitle: "Tagesbonus", bonusDescription: "Alle 3 Aufgaben abschließen", bonusOpen: "Öffnen", bonusClaimed: "Geöffnet", claimSuccess: "Belohnung erhalten +{amount}", claimFailed: "Abholen fehlgeschlagen. Versuche es erneut.", claimUnknown: "Speicherstatus unbekannt. Tippe erneut zum Bestätigen.", coinsFull: "Der Münzspeicher ist voll.", "task.clear-levels.title": "Level schaffen", "task.clear-levels.description": "Schließe {target} Level ab", "task.earn-stars.title": "Sterne sammeln", "task.earn-stars.description": "Sammle {target} Sterne", "task.perfect-clear.title": "Perfekter Sieg", "task.perfect-clear.description": "Erreiche {target}x drei Sterne", "task.booster-free.title": "Reines Können", "task.booster-free.description": "Schaffe {target} Level ohne Booster", "task.use-booster.title": "Power-up", "task.use-booster.description": "Nutze {target} Booster bei einem Sieg" },
  ru: { ...en, entry: "Ежедневно", title: "Ежедневные задания", summary: "Прогресс сегодня  {completed}/{total}", resetsIn: "Обновление через {time}", claim: "Получить", claimed: "Получено", incomplete: "Играть", bonusTitle: "Ежедневный бонус", bonusDescription: "Выполните все 3 задания", bonusOpen: "Открыть", bonusClaimed: "Открыто", claimSuccess: "Награда получена +{amount}", claimFailed: "Не удалось получить награду. Повторите попытку.", claimUnknown: "Статус сохранения неизвестен. Нажмите ещё раз для проверки.", coinsFull: "Хранилище монет заполнено.", "task.clear-levels.title": "Пройти уровни", "task.clear-levels.description": "Пройдите {target} уровня", "task.earn-stars.title": "Собрать звёзды", "task.earn-stars.description": "Получите {target} звёзд", "task.perfect-clear.title": "Идеальная победа", "task.perfect-clear.description": "Получите 3 звезды {target} раз", "task.booster-free.title": "Чистое мастерство", "task.booster-free.description": "Пройдите {target} уровня без усилителей", "task.use-booster.title": "Усиление", "task.use-booster.description": "Используйте {target} усилитель при победе" },
};

export const dailyTaskText = (
  language: GameLanguage,
  key: DailyTaskTextKey,
  params: Readonly<Record<string, string | number>> = {},
): string => {
  const template = dictionaries[language]?.[key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ));
};

export const DAILY_TASK_TEXT_KEYS = Object.freeze(Object.keys(en) as DailyTaskTextKey[]);
