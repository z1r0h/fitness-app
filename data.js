// 动作库 —— 图片来自开源项目 yuhonas/free-exercise-db (GitHub 托管，稳定可靠)
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
function exImg(id, n = 0) { return IMG_BASE + id + "/" + n + ".jpg"; }

// equip 等级: 0=徒手(无器械)  1=哑铃(家用配重)  2=健身房(杠铃/器械/绳索)
// group: chest 胸 / back 背 / legs 腿 / shoulders 肩 / biceps 肱二 / triceps 肱三 / core 核心 / cardio 有氧
// bw=true 自重(记次数)  sec=true 记秒数  cali=true 街健/徒手动作
// chain + lvl: 属于某条「进阶链」，lvl 越大越难，达标后自动建议升级到下一阶
const EXERCISES = [
  // ===== 胸 chest =====
  { id: "Barbell_Bench_Press_-_Medium_Grip", name: "杠铃卧推", group: "chest", equip: 2, type: "compound", tip: "肩胛收紧下沉，杠铃落至下胸，匀速推起。" },
  { id: "Dumbbell_Bench_Press", name: "哑铃平板卧推", group: "chest", equip: 1, type: "compound", tip: "手腕中立，下放至胸侧有牵拉感。" },
  { id: "Incline_Dumbbell_Press", name: "上斜哑铃卧推", group: "chest", equip: 1, type: "compound", tip: "椅背约30°，刺激上胸。" },
  { id: "Dumbbell_Flyes", name: "哑铃飞鸟", group: "chest", equip: 1, type: "iso", tip: "手肘微屈固定，像抱大树一样合拢。" },
  // 俯卧撑进阶链 pushup
  { id: "Incline_Push-Up", name: "上斜俯卧撑", group: "chest", equip: 0, bw: true, cali: true, chain: "pushup", lvl: 1, type: "compound", tip: "手撑高处（桌/台阶），最易上手的起点。" },
  { id: "Pushups", name: "标准俯卧撑", group: "chest", equip: 0, bw: true, cali: true, chain: "pushup", lvl: 2, type: "compound", tip: "身体成一条直线，核心收紧，下到胸离地一拳。" },
  { id: "Pushups_Close_and_Wide_Hand_Positions", name: "窄距/钻石俯卧撑", group: "chest", equip: 0, bw: true, cali: true, chain: "pushup", lvl: 3, type: "compound", tip: "双手靠拢成钻石，更虐胸内侧与三头。" },
  { id: "Decline_Push-Up", name: "下斜俯卧撑", group: "chest", equip: 0, bw: true, cali: true, chain: "pushup", lvl: 4, type: "compound", tip: "双脚垫高，重心前移加大难度。" },
  { id: "Handstand_Push-Ups", name: "倒立撑", group: "shoulders", equip: 0, bw: true, cali: true, chain: "pushup", lvl: 5, type: "compound", tip: "靠墙倒立下推，俯卧撑链顶阶，量力而行。" },
  { id: "Dips_-_Chest_Version", name: "双杠臂屈伸(胸)", group: "chest", equip: 0, bw: true, cali: true, type: "compound", tip: "身体前倾，重点落在下胸。" },

  // ===== 背 back =====
  { id: "Barbell_Deadlift", name: "杠铃硬拉", group: "back", equip: 2, type: "compound", tip: "背部挺直，髋主导发力，全程贴近身体。" },
  { id: "Bent_Over_Barbell_Row", name: "杠铃俯身划船", group: "back", equip: 2, type: "compound", tip: "上身约45°，向腹部拉，挤压背部。" },
  { id: "Bent_Over_Two-Dumbbell_Row", name: "哑铃俯身划船", group: "back", equip: 1, type: "compound", tip: "肘部贴身后拉，感受背阔收缩。" },
  { id: "Dumbbell_Incline_Row", name: "上斜哑铃划船", group: "back", equip: 1, type: "compound", tip: "趴在上斜凳上，消除借力练背中部。" },
  { id: "Wide-Grip_Lat_Pulldown", name: "宽握高位下拉", group: "back", equip: 2, type: "compound", tip: "挺胸，把横杆拉到上胸。" },
  { id: "Seated_Cable_Rows", name: "坐姿绳索划船", group: "back", equip: 2, type: "compound", tip: "保持背挺直，肩胛后收。" },
  // 引体进阶链 pullup
  { id: "Inverted_Row", name: "反向划船(水平引体)", group: "back", equip: 0, bw: true, cali: true, chain: "pullup", lvl: 1, type: "compound", tip: "身体绷直斜挂横杆下，把胸口拉向杆，引体起点。" },
  { id: "Scapular_Pull-Up", name: "肩胛引体", group: "back", equip: 0, bw: true, cali: true, chain: "pullup", lvl: 2, type: "compound", tip: "手臂不弯，只用下沉肩胛把身体微微拉起，练发力感。" },
  { id: "Band_Assisted_Pull-Up", name: "弹力带辅助引体", group: "back", equip: 0, bw: true, cali: true, chain: "pullup", lvl: 3, type: "compound", tip: "脚踩弹力带减负，过渡到完整引体。" },
  { id: "Pullups", name: "标准引体向上", group: "back", equip: 0, bw: true, cali: true, chain: "pullup", lvl: 4, type: "compound", tip: "全程控制，下放到手臂伸直，下巴过杆。" },
  { id: "Wide-Grip_Rear_Pull-Up", name: "宽握引体向上", group: "back", equip: 0, bw: true, cali: true, chain: "pullup", lvl: 5, type: "compound", tip: "宽握更孤立背阔，难度提升。" },
  { id: "Muscle_Up", name: "双力臂 (力量上杠)", group: "back", equip: 0, bw: true, cali: true, chain: "pullup", lvl: 6, type: "compound", tip: "引体顶阶：爆发拉起翻腕上撑，街健标志动作。" },
  { id: "Chin-Up", name: "反握引体向上", group: "back", equip: 0, bw: true, cali: true, type: "compound", tip: "掌心朝己，更多调动肱二头，背二头同练。" },
  { id: "Superman", name: "超人挺身", group: "back", equip: 0, bw: true, cali: true, type: "iso", tip: "俯卧同时抬起手脚，顶端停1秒，练下背。" },
  { id: "Hyperextensions_With_No_Hyperextension_Bench", name: "俯卧背挺身", group: "back", equip: 0, bw: true, cali: true, type: "iso", tip: "俯卧地面，上身抬起收紧下背与臀。" },

  // ===== 腿 legs =====
  { id: "Barbell_Squat", name: "杠铃深蹲", group: "legs", equip: 2, type: "compound", tip: "下蹲至大腿平行，膝盖对准脚尖。" },
  { id: "Leg_Press", name: "倒蹬腿举", group: "legs", equip: 2, type: "compound", tip: "脚掌踩稳，不要锁死膝盖。" },
  { id: "Romanian_Deadlift", name: "罗马尼亚硬拉", group: "legs", equip: 2, type: "compound", tip: "屈髋后送，感受腘绳肌牵拉。" },
  { id: "Barbell_Hip_Thrust", name: "杠铃臀冲", group: "legs", equip: 2, type: "compound", tip: "肩靠凳，顶端夹紧臀部，练翘臀利器。" },
  { id: "Leg_Extensions", name: "坐姿腿屈伸", group: "legs", equip: 2, type: "iso", tip: "顶峰挤压股四头肌1秒。" },
  { id: "Lying_Leg_Curls", name: "俯卧腿弯举", group: "legs", equip: 2, type: "iso", tip: "控制离心，别用惯性甩。" },
  { id: "Standing_Calf_Raises", name: "站姿提踵", group: "legs", equip: 2, type: "iso", tip: "最高点停顿，充分顶起小腿。" },
  { id: "Goblet_Squat", name: "高脚杯深蹲", group: "legs", equip: 1, type: "compound", tip: "哑铃抱于胸前，挺胸下蹲。" },
  { id: "Dumbbell_Lunges", name: "哑铃箭步蹲", group: "legs", equip: 1, type: "compound", tip: "前后腿都成90°，躯干直立。" },
  // 深蹲进阶链 squat
  { id: "Bodyweight_Squat", name: "自重深蹲", group: "legs", equip: 0, bw: true, cali: true, chain: "squat", lvl: 1, type: "compound", tip: "重心在脚跟，蹲到大腿平行。" },
  { id: "Bodyweight_Walking_Lunge", name: "自重行走箭步蹲", group: "legs", equip: 0, bw: true, cali: true, chain: "squat", lvl: 2, type: "compound", tip: "步幅适中，保持平衡，单边发力更强。" },
  { id: "Single-Leg_High_Box_Squat", name: "单腿箱式深蹲", group: "legs", equip: 0, bw: true, cali: true, chain: "squat", lvl: 3, type: "compound", tip: "单腿坐到高凳再起，通往手枪蹲的过渡。" },
  { id: "Single_Leg_Glute_Bridge", name: "单腿臀桥", group: "legs", equip: 0, bw: true, cali: true, type: "iso", tip: "单脚撑地顶髋，臀部顶端夹紧。" },
  { id: "Step-up_with_Knee_Raise", name: "登阶提膝", group: "legs", equip: 0, bw: true, cali: true, type: "compound", tip: "踩上台阶并提膝，单腿力量+平衡。" },
  { id: "Freehand_Jump_Squat", name: "自重跳蹲", group: "legs", equip: 0, bw: true, cali: true, type: "compound", tip: "下蹲后爆发起跳，落地缓冲，练爆发力。" },
  { id: "Barbell_Glute_Bridge", name: "臀桥", group: "legs", equip: 0, bw: true, cali: true, type: "compound", tip: "顶端夹紧臀部停1秒。无杠铃可徒手做。" },

  // ===== 肩 shoulders =====
  { id: "Barbell_Shoulder_Press", name: "杠铃站姿推举", group: "shoulders", equip: 2, type: "compound", tip: "核心收紧，垂直向上推。" },
  { id: "Dumbbell_Shoulder_Press", name: "哑铃肩上推举", group: "shoulders", equip: 1, type: "compound", tip: "推起时不要锁死，控制下放。" },
  { id: "Arnold_Dumbbell_Press", name: "阿诺德推举", group: "shoulders", equip: 1, type: "compound", tip: "推起过程旋转手腕，全方位刺激三角肌。" },
  { id: "Side_Lateral_Raise", name: "哑铃侧平举", group: "shoulders", equip: 1, type: "iso", tip: "小重量，肘略高于腕，别耸肩。" },
  { id: "Face_Pull", name: "面拉", group: "shoulders", equip: 2, type: "iso", tip: "拉向面部，外旋打开，练后束。" },

  // ===== 肱二头 biceps =====
  { id: "Barbell_Curl", name: "杠铃弯举", group: "biceps", equip: 2, type: "iso", tip: "大臂固定，只弯小臂。" },
  { id: "Dumbbell_Bicep_Curl", name: "哑铃弯举", group: "biceps", equip: 1, type: "iso", tip: "顶峰旋腕挤压，慢放。" },
  { id: "Hammer_Curls", name: "锤式弯举", group: "biceps", equip: 1, type: "iso", tip: "中立握，练肱肌与前臂。" },

  // ===== 肱三头 triceps =====
  { id: "Triceps_Pushdown", name: "绳索三头下压", group: "triceps", equip: 2, type: "iso", tip: "大臂夹紧躯干，向下伸直。" },
  { id: "Lying_Triceps_Press", name: "仰卧臂屈伸", group: "triceps", equip: 1, type: "iso", tip: "肘部固定，下放到额头附近。" },
  // 臂屈伸进阶链 dip
  { id: "Bench_Dips", name: "凳上臂屈伸", group: "triceps", equip: 0, bw: true, cali: true, chain: "dip", lvl: 1, type: "compound", tip: "手撑凳子屈肘下沉，臂屈伸起点。" },
  { id: "Parallel_Bar_Dip", name: "双杠臂屈伸", group: "triceps", equip: 0, bw: true, cali: true, chain: "dip", lvl: 2, type: "compound", tip: "双杠上身体直立下沉，重点三头。" },
  { id: "Ring_Dips", name: "吊环臂屈伸", group: "triceps", equip: 0, bw: true, cali: true, chain: "dip", lvl: 3, type: "compound", tip: "吊环不稳需更强控制，臂屈伸顶阶。" },
  { id: "Dips_-_Triceps_Version", name: "双杠臂屈伸(三头)", group: "triceps", equip: 0, bw: true, cali: true, type: "compound", tip: "身体直立，肘向后不外张。" },

  // ===== 核心 core =====
  { id: "Plank", name: "平板支撑", group: "core", equip: 0, bw: true, sec: true, cali: true, type: "iso", tip: "身体成直线，臀腹收紧，别塌腰。" },
  { id: "Air_Bike", name: "空中蹬车", group: "core", equip: 0, bw: true, cali: true, type: "iso", tip: "对侧肘膝相触，慢速旋转。" },
  { id: "Russian_Twist", name: "俄罗斯转体", group: "core", equip: 0, bw: true, cali: true, type: "iso", tip: "上身后倾，左右转体触地。" },
  { id: "3_4_Sit-Up", name: "仰卧起坐", group: "core", equip: 0, bw: true, cali: true, type: "iso", tip: "用腹部卷起，别用脖子借力。" },
  { id: "Cable_Crunch", name: "绳索跪姿卷腹", group: "core", equip: 2, type: "iso", tip: "团身卷腹，感受腹直肌缩短。" },
  // 悬垂举腿进阶链 hang
  { id: "Reverse_Crunch", name: "反向卷腹", group: "core", equip: 0, bw: true, cali: true, chain: "hang", lvl: 1, type: "iso", tip: "躺地把膝盖卷向胸口，下腹发力，起点。" },
  { id: "Hanging_Leg_Raise", name: "悬垂屈膝举腿", group: "core", equip: 0, bw: true, cali: true, chain: "hang", lvl: 2, type: "iso", tip: "悬挂杆上屈膝上提，控制不摆动。" },
  { id: "Hanging_Pike", name: "悬垂直腿举 (L字)", group: "core", equip: 0, bw: true, cali: true, chain: "hang", lvl: 3, type: "iso", tip: "直腿抬到与地面平行，通往 L-sit / 旗帜。" },

  // ===== 有氧 cardio =====
  { id: "Mountain_Climbers", name: "登山跑", group: "cardio", equip: 0, bw: true, sec: true, cali: true, type: "compound", tip: "核心稳定，快速交替提膝。" },
  { id: "Rope_Jumping", name: "跳绳", group: "cardio", equip: 0, bw: true, sec: true, cali: true, type: "compound", tip: "前脚掌着地，手腕摇绳。" },
  { id: "Knee_Tuck_Jump", name: "收膝跳", group: "cardio", equip: 0, bw: true, sec: true, cali: true, type: "compound", tip: "原地跳起把膝盖收向胸，落地缓冲。" },
];

const GROUP_NAMES = {
  chest: "胸", back: "背", legs: "腿", shoulders: "肩",
  biceps: "肱二头", triceps: "肱三头", core: "核心", cardio: "有氧"
};

// ===== 进阶链（成长计划）=====
const CHAIN_NAMES = { pushup: "俯卧撑进阶", dip: "臂屈伸进阶", pullup: "引体向上进阶", squat: "深蹲进阶", hang: "悬垂举腿进阶" };
function chainMembers(chain) { return EXERCISES.filter(e => e.chain === chain).sort((a, b) => a.lvl - b.lvl); }
function chainExercise(chain, lvl) { const m = chainMembers(chain); if (!m.length) return null; return m[Math.max(0, Math.min(m.length - 1, lvl - 1))]; }
function nextInChain(ex) { return ex.chain ? (chainMembers(ex.chain).find(e => e.lvl === ex.lvl + 1) || null) : null; }
