/* ============================================================
   小六太乙 · 八字引擎 bazi-engine.js
   ------------------------------------------------------------
   把老祖宗的溫柔，做成日日可用的小工具。

   這是一個「純邏輯」模組——所有函式都是 輸入資料 → 輸出資料，
   不碰任何 DOM、不依賴任何 UI。可以被 HTML 工具、Node.js、
   或太乙人道命法工具共用。

   依賴：solar-lunar（瀏覽器全域變數 solarLunar，或 npm 'solarlunar'）
   用於四柱排盤（solar2lunar / getTerm / getYearInGanZhi 等）。

   對外：window.BaziEngine（瀏覽器）或 module.exports（Node）
   ============================================================ */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BaziEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ============================================================
    // 一、基礎常數
    // ============================================================

    const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    // 天干五行 + 陰陽
    const DAY_MASTER_DATA = {
        '甲': { element: '木', yinYang: '陽' },
        '乙': { element: '木', yinYang: '陰' },
        '丙': { element: '火', yinYang: '陽' },
        '丁': { element: '火', yinYang: '陰' },
        '戊': { element: '土', yinYang: '陽' },
        '己': { element: '土', yinYang: '陰' },
        '庚': { element: '金', yinYang: '陽' },
        '辛': { element: '金', yinYang: '陰' },
        '壬': { element: '水', yinYang: '陽' },
        '癸': { element: '水', yinYang: '陰' }
    };

    // 地支五行
    const BRANCH_ELEMENTS = {
        '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
        '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
    };

    // 五行性格意象（給命書開場用）
    const ELEMENT_IMAGERY = {
        '甲': { archetype: '棟樑、大樹', nature: '直挺、有方向、成長性' },
        '乙': { archetype: '藤蔓、花草', nature: '柔韌、靈活、適應性強' },
        '丙': { archetype: '太陽、光', nature: '熱情、明亮、外顯' },
        '丁': { archetype: '燭火、爐火', nature: '細膩、溫暖、內斂' },
        '戊': { archetype: '高山、城牆', nature: '厚重、穩定、可信' },
        '己': { archetype: '田園、土壤', nature: '包容、滋養、踏實' },
        '庚': { archetype: '刀刃、機械', nature: '剛硬、果決、有原則' },
        '辛': { archetype: '珠寶、刻刀', nature: '精緻、敏銳、有風骨' },
        '壬': { archetype: '江河、海洋', nature: '奔放、博大、流動' },
        '癸': { archetype: '雨露、井泉', nature: '滋潤、深思、滲透' }
    };

    // 天干合剋
    const STEM_INTERACTIONS = {
        '甲': { combinesWith: '己', clashesWith: '庚' },
        '乙': { combinesWith: '庚', clashesWith: '辛' },
        '丙': { combinesWith: '辛', clashesWith: '壬' },
        '丁': { combinesWith: '壬', clashesWith: '癸' },
        '戊': { combinesWith: '癸', clashesWith: null },
        '己': { combinesWith: '甲', clashesWith: null },
        '庚': { combinesWith: '乙', clashesWith: '甲' },
        '辛': { combinesWith: '丙', clashesWith: '乙' },
        '壬': { combinesWith: '丁', clashesWith: '丙' },
        '癸': { combinesWith: '戊', clashesWith: '丁' }
    };

    // 地支合衝
    const BRANCH_INTERACTIONS = {
        '子': { combinesWith: '丑', clashesWith: '午' },
        '丑': { combinesWith: '子', clashesWith: '未' },
        '寅': { combinesWith: '亥', clashesWith: '申' },
        '卯': { combinesWith: '戌', clashesWith: '酉' },
        '辰': { combinesWith: '酉', clashesWith: '戌' },
        '巳': { combinesWith: '申', clashesWith: '亥' },
        '午': { combinesWith: '未', clashesWith: '子' },
        '未': { combinesWith: '午', clashesWith: '丑' },
        '申': { combinesWith: '巳', clashesWith: '寅' },
        '酉': { combinesWith: '辰', clashesWith: '卯' },
        '戌': { combinesWith: '卯', clashesWith: '辰' },
        '亥': { combinesWith: '寅', clashesWith: '巳' }
    };

    // 十神對照表（日主天干 × 對方天干）
    const TEN_GODS_MAP = {
        '甲': { '甲': '比肩', '乙': '劫財', '丙': '食神', '丁': '傷官', '戊': '偏財', '己': '正財', '庚': '七殺', '辛': '正官', '壬': '偏印', '癸': '正印' },
        '乙': { '甲': '劫財', '乙': '比肩', '丙': '傷官', '丁': '食神', '戊': '正財', '己': '偏財', '庚': '正官', '辛': '七殺', '壬': '正印', '癸': '偏印' },
        '丙': { '甲': '偏印', '乙': '正印', '丙': '比肩', '丁': '劫財', '戊': '食神', '己': '傷官', '庚': '偏財', '辛': '正財', '壬': '七殺', '癸': '正官' },
        '丁': { '甲': '正印', '乙': '偏印', '丙': '劫財', '丁': '比肩', '戊': '傷官', '己': '食神', '庚': '正財', '辛': '偏財', '壬': '正官', '癸': '七殺' },
        '戊': { '甲': '七殺', '乙': '正官', '丙': '偏印', '丁': '正印', '戊': '比肩', '己': '劫財', '庚': '食神', '辛': '傷官', '壬': '偏財', '癸': '正財' },
        '己': { '甲': '正官', '乙': '七殺', '丙': '正印', '丁': '偏印', '戊': '劫財', '己': '比肩', '庚': '傷官', '辛': '食神', '壬': '正財', '癸': '偏財' },
        '庚': { '甲': '偏財', '乙': '正財', '丙': '七殺', '丁': '正官', '戊': '偏印', '己': '正印', '庚': '比肩', '辛': '劫財', '壬': '食神', '癸': '傷官' },
        '辛': { '甲': '正財', '乙': '偏財', '丙': '正官', '丁': '七殺', '戊': '正印', '己': '偏印', '庚': '劫財', '辛': '比肩', '壬': '傷官', '癸': '食神' },
        '壬': { '甲': '食神', '乙': '傷官', '丙': '偏財', '丁': '正財', '戊': '七殺', '己': '正官', '庚': '偏印', '辛': '正印', '壬': '比肩', '癸': '劫財' },
        '癸': { '甲': '傷官', '乙': '食神', '丙': '正財', '丁': '偏財', '戊': '正官', '己': '七殺', '庚': '正印', '辛': '偏印', '壬': '劫財', '癸': '比肩' }
    };

    // 十神意象
    const TEN_GODS_EXPLANATIONS = {
        '比肩': '代表合夥以及同性的合作。',
        '劫財': '代表財物消耗、競爭與人脈。',
        '食神': '代表機遇、享受與口福，也象徵創造力和表現力。',
        '傷官': '代表創造、情感與能量付出，也可能帶來口舌是非。',
        '偏財': '代表不在預期內的大筆收入機會或異性緣。',
        '正財': '代表穩定的收入與工作，大環境有利於賺錢。',
        '七殺': '代表非職場的管束壓力與挑戰（女性也代表非典型的異性緣）。',
        '正官': '代表職場的管束與責任（女性也代表穩定的異性緣或婚姻）。',
        '偏印': '代表非傳統、技藝類的學習與喜好。',
        '正印': '代表學習、貴人、文書與庇蔭。'
    };

    // 地支藏干（完整版：主氣 / 中氣 / 餘氣）
    const BRANCH_HIDDEN_STEMS_FULL = {
        '子': ['癸'],
        '丑': ['己', '癸', '辛'],
        '寅': ['甲', '丙', '戊'],
        '卯': ['乙'],
        '辰': ['戊', '乙', '癸'],
        '巳': ['丙', '庚', '戊'],
        '午': ['丁', '己'],
        '未': ['己', '丁', '乙'],
        '申': ['庚', '壬', '戊'],
        '酉': ['辛'],
        '戌': ['戊', '辛', '丁'],
        '亥': ['壬', '甲']
    };

    // 地支藏干（主氣，向後相容）
    const BRANCH_HIDDEN_STEMS = {
        '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
        '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
    };

    // 日柱空亡規則
    const KONG_WANG_RULES = {
        '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'], '己巳': ['戌', '亥'], '庚午': ['戌', '亥'], '辛未': ['戌', '亥'], '壬申': ['戌', '亥'], '癸酉': ['戌', '亥'],
        '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['申', '酉'], '丁丑': ['申', '酉'], '戊寅': ['申', '酉'], '己卯': ['申', '酉'], '庚辰': ['申', '酉'], '辛巳': ['申', '酉'], '壬午': ['申', '酉'], '癸未': ['申', '酉'],
        '甲申': ['午', '未'], '乙酉': ['午', '未'], '丙戌': ['午', '未'], '丁亥': ['午', '未'], '戊子': ['午', '未'], '己丑': ['午', '未'], '庚寅': ['午', '未'], '辛卯': ['午', '未'], '壬辰': ['午', '未'], '癸巳': ['午', '未'],
        '甲午': ['辰', '巳'], '乙未': ['辰', '巳'], '丙申': ['辰', '巳'], '丁酉': ['辰', '巳'], '戊戌': ['辰', '巳'], '己亥': ['辰', '巳'], '庚子': ['辰', '巳'], '辛丑': ['辰', '巳'], '壬寅': ['辰', '巳'], '癸卯': ['辰', '巳'],
        '甲辰': ['寅', '卯'], '乙巳': ['寅', '卯'], '丙午': ['寅', '卯'], '丁未': ['寅', '卯'], '戊申': ['寅', '卯'], '己酉': ['寅', '卯'], '庚戌': ['寅', '卯'], '辛亥': ['寅', '卯'], '壬子': ['寅', '卯'], '癸丑': ['寅', '卯'],
        '甲寅': ['子', '丑'], '乙卯': ['子', '丑'], '丙辰': ['子', '丑'], '丁巳': ['子', '丑'], '戊午': ['子', '丑'], '己未': ['子', '丑'], '庚申': ['子', '丑'], '辛酉': ['子', '丑'], '壬戌': ['子', '丑'], '癸亥': ['子', '丑']
    };

    // 五行相生相剋
    const ELEMENT_GENERATES = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const ELEMENT_OVERCOMES = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

    // 時辰地支對照（24 小時制 → 時支）
    const HOUR_TO_BRANCH = [
        '子', '丑', '丑', '寅', '寅', '卯', '卯', '辰', '辰', '巳', '巳', '午',
        '午', '未', '未', '申', '申', '酉', '酉', '戌', '戌', '亥', '亥', '子'
    ];

    // 五鼠遁（日干 → 子時起的時干）
    const HOUR_STEM_RULES = {
        '甲': '甲', '己': '甲',
        '乙': '丙', '庚': '丙',
        '丙': '戊', '辛': '戊',
        '丁': '庚', '壬': '庚',
        '戊': '壬', '癸': '壬'
    };

    // ============================================================
    // 二、基礎工具函式
    // ============================================================

    function getDayMasterData(dayStem) {
        if (!dayStem || !DAY_MASTER_DATA[dayStem]) return null;
        const data = DAY_MASTER_DATA[dayStem];
        return { stem: dayStem, element: data.element, yinYang: data.yinYang };
    }

    function getElementOf(stemOrBranch) {
        if (DAY_MASTER_DATA[stemOrBranch]) return DAY_MASTER_DATA[stemOrBranch].element;
        if (BRANCH_ELEMENTS[stemOrBranch]) return BRANCH_ELEMENTS[stemOrBranch];
        return null;
    }

    // 取十神：日主天干 對 任一天干
    function getTenGod(dayStem, targetStem) {
        return (TEN_GODS_MAP[dayStem] && TEN_GODS_MAP[dayStem][targetStem]) || '未知';
    }

    // 五行關係：A 對 B 是什麼關係（生我/我生/剋我/我剋/同我）
    function getElementRelation(elementA, elementB) {
        if (elementA === elementB) return '同我';
        if (ELEMENT_GENERATES[elementB] === elementA) return '生我';   // B 生 A
        if (ELEMENT_GENERATES[elementA] === elementB) return '我生';   // A 生 B
        if (ELEMENT_OVERCOMES[elementB] === elementA) return '剋我';   // B 剋 A
        if (ELEMENT_OVERCOMES[elementA] === elementB) return '我剋';   // A 剋 B
        return '無';
    }

    // ============================================================
    // 三、四柱排盤（依賴 solar-lunar）
    // ============================================================

    // 允許外部手動注入 solarLunar 函式庫（最穩健的方式）
    var _injectedSolarLunar = null;
    function setSolarLunar(lib) {
        var resolved = _resolveSolarLunar(lib);
        if (resolved) _injectedSolarLunar = resolved;
    }

    // 把可能包了一層 .default 的函式庫解開，回傳真正有 solar2lunar 的物件
    function _resolveSolarLunar(lib) {
        if (!lib) return null;
        if (typeof lib.solar2lunar === 'function') return lib;
        if (lib.default && typeof lib.default.solar2lunar === 'function') return lib.default;
        return null;
    }

    function _getSolarLunar() {
        // 1. 優先用外部手動注入的
        if (_injectedSolarLunar) return _injectedSolarLunar;
        // 2. 從各種可能的全域物件找 solarLunar（瀏覽器）
        var g = (typeof globalThis !== 'undefined') ? globalThis
              : (typeof window !== 'undefined') ? window
              : (typeof self !== 'undefined') ? self : null;
        if (g) {
            var fromGlobal = _resolveSolarLunar(g.solarLunar) || _resolveSolarLunar(g.solarlunar);
            if (fromGlobal) return fromGlobal;
        }
        // 3. 裸變數參照（某些環境）
        try { var s1 = _resolveSolarLunar(solarLunar); if (s1) return s1; } catch (e) {}
        try { var s2 = _resolveSolarLunar(solarlunar); if (s2) return s2; } catch (e) {}
        // 4. Node：npm 套件（可能在 .default 裡）
        if (typeof require === 'function') {
            try {
                var mod = _resolveSolarLunar(require('solarlunar'));
                if (mod) return mod;
            } catch (e) { /* ignore */ }
        }
        throw new Error('bazi-engine 需要 solarlunar 函式庫。請先呼叫 BaziEngine.setSolarLunar(solarLunar) 或確認 solarlunar.min.js 已載入。');
    }

    /**
     * 從國曆生日 + 時辰，計算完整四柱八字
     * @param {number} year 國曆年
     * @param {number} month 國曆月（1-12）
     * @param {number} day 國曆日
     * @param {number} hour 24 小時制（0-23）
     * @returns {Object} { yearPillar, monthPillar, dayPillar, hourPillar, lunarInfo }
     */
    /**
     * 節氣資料防護（M2）：solar-lunar 的精確節氣表僅涵蓋 1930–2100。
     * 超出範圍時 getTerm 回 0，年/月柱會「默默排錯」（如 1920 年柱差一年、月柱空白；
     * 2110 月柱恆為子月）。此處以資料探測（非寫死範圍）擋下，拋明確錯誤。
     */
    function _assertTermData(sl, year, what) {
        if (typeof sl.getTerm === 'function' && !sl.getTerm(year, 3)) {
            throw new Error('西元 ' + year + ' 年超出節氣資料範圍（1930–2100），無法準確排' + (what || '盤') + '。');
        }
    }

    function calculateFourPillars(year, month, day, hour) {
        const sl = _getSolarLunar();
        _assertTermData(sl, year, '盤');
        const lunar = sl.solar2lunar(year, month, day, hour);

        // 標準化讀取干支：同時支援兩種函式庫
        //   A. method 版（Nakai 的 solar-lunar.js）：lunar.getYearInGanZhi() 等
        //   B. property 版（npm solarlunar）：lunar.gzYear 等
        const yearPillar = _readGanZhi(lunar, 'year');
        const monthPillar = _readGanZhi(lunar, 'month');
        const dayPillar = _readGanZhi(lunar, 'day');

        // 跨年邊界（如 1930 年 1 月小寒前需 1929 年節氣）資料不足時，月柱會是空字串
        if (!monthPillar) {
            throw new Error('該日期落在節氣資料邊界（需要前一年的節氣資料），無法排月柱。');
        }

        // 時柱：優先用函式庫的（若有 getTimeInGanZhi），否則用五鼠遁自算
        let hourPillar;
        if (typeof lunar.getTimeInGanZhi === 'function') {
            hourPillar = lunar.getTimeInGanZhi();
        } else {
            hourPillar = calculateHourPillar(dayPillar.charAt(0), hour || 0);
        }

        return {
            yearPillar: yearPillar,
            monthPillar: monthPillar,
            dayPillar: dayPillar,
            hourPillar: hourPillar,
            lunarInfo: {
                lunarYear: lunar.lunarYear || null,
                lunarMonth: lunar.lunarMonth || null,
                lunarDay: lunar.lunarDay || null,
                lunarMonthName: lunar.monthCn || null,
                lunarDayName: lunar.dayCn || null,
                animal: (typeof lunar.getZodiac === 'function') ? lunar.getZodiac() : (lunar.animal || null),
                term: lunar.term || null
            }
        };
    }

    /**
     * 標準化讀取某一柱的干支，兼容 method 版與 property 版函式庫
     * @param {Object} lunar solar2lunar 回傳的物件
     * @param {string} which 'year' | 'month' | 'day'
     */
    function _readGanZhi(lunar, which) {
        // method 版（Nakai 的 solar-lunar.js）
        const methodMap = { year: 'getYearInGanZhi', month: 'getMonthInGanZhi', day: 'getDayInGanZhi' };
        const methodName = methodMap[which];
        if (typeof lunar[methodName] === 'function') {
            return lunar[methodName]();
        }
        // property 版（npm solarlunar）
        const propMap = { year: 'gzYear', month: 'gzMonth', day: 'gzDay' };
        const propName = propMap[which];
        if (lunar[propName]) return lunar[propName];
        throw new Error('無法從 solarlunar 物件讀取' + which + '柱干支（不支援的函式庫格式）');
    }

    /**
     * 時柱計算（五鼠遁）— 當函式庫沒提供 getTimeInGanZhi 時的後備
     * @param {string} dayStem 日干
     * @param {number} hour 24 小時制（0-23）
     */
    function calculateHourPillar(dayStem, hour) {
        const branch = HOUR_TO_BRANCH[hour];
        const branchIndex = EARTHLY_BRANCHES.indexOf(branch);
        const ziStem = HOUR_STEM_RULES[dayStem];
        const ziStemIndex = HEAVENLY_STEMS.indexOf(ziStem);
        const stemIndex = (ziStemIndex + branchIndex) % 10;
        return HEAVENLY_STEMS[stemIndex] + branch;
    }

    /**
     * 流年柱：取該年 3 月 1 日（確保已過立春）
     */
    function getAnnualPillar(targetYear) {
        const sl = _getSolarLunar();
        _assertTermData(sl, targetYear, '流年');
        const lunar = sl.solar2lunar(targetYear, 3, 1);
        return _readGanZhi(lunar, 'year');
    }

    /**
     * 流月柱：依節氣月計算
     * @param {number} year 國曆年
     * @param {number} month 國曆月
     * @param {number} day 國曆日（用來判斷是否過了當月的節氣）
     */
    function getMonthlyPillar(year, month, day) {
        const sl = _getSolarLunar();
        _assertTermData(sl, year, '流月');
        const lunar = sl.solar2lunar(year, month, day || 15);
        const gz = _readGanZhi(lunar, 'month');
        if (!gz) throw new Error('該日期落在節氣資料邊界，無法排流月。');
        return gz;
    }

    /**
     * 流日柱
     */
    function getDailyPillar(year, month, day) {
        const sl = _getSolarLunar();
        const lunar = sl.solar2lunar(year, month, day);
        return _readGanZhi(lunar, 'day');
    }

    // ============================================================
    // 四、八字分析
    // ============================================================

    /**
     * 取得日主完整資訊
     */
    function getDayMasterInfo(dayPillar) {
        const dayStem = dayPillar.charAt(0);
        const data = getDayMasterData(dayStem);
        if (!data) return null;
        const imagery = ELEMENT_IMAGERY[dayStem] || {};
        return {
            stem: dayStem,
            element: data.element,
            yinYang: data.yinYang,
            label: `${data.yinYang}${data.element}`,
            archetype: imagery.archetype || '',
            nature: imagery.nature || ''
        };
    }

    /**
     * 全盤十神分布：四柱的天干 + 地支藏干，各自對日主的十神
     */
    function analyzeFullTenGods(pillars) {
        const dayStem = pillars.dayPillar.charAt(0);
        const result = {};

        ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'].forEach(key => {
            const pillar = pillars[key];
            const stem = pillar.charAt(0);
            const branch = pillar.charAt(1);

            // 天干十神（日柱天干 = 日主本身，標示為「日主」）
            const stemTenGod = (key === 'dayPillar') ? '日主' : getTenGod(dayStem, stem);

            // 地支藏干十神（完整：主/中/餘氣）
            const hiddenStems = BRANCH_HIDDEN_STEMS_FULL[branch] || [];
            const branchTenGods = hiddenStems.map((hs, idx) => ({
                stem: hs,
                tenGod: getTenGod(dayStem, hs),
                role: idx === 0 ? '主氣' : (idx === 1 ? '中氣' : '餘氣')
            }));

            result[key] = {
                pillar: pillar,
                stem: stem,
                stemElement: getElementOf(stem),
                stemTenGod: stemTenGod,
                branch: branch,
                branchElement: getElementOf(branch),
                branchHiddenStems: branchTenGods
            };
        });

        return result;
    }

    /**
     * 五行強弱統計（簡易版：計算八字裡五行各佔幾分）
     * 注意：這不是「身強身弱」判定，只是五行分布統計。
     * 身強身弱的完整判定（得令/通根/透干）由使用者另行提供邏輯。
     */
    function analyzeElementDistribution(pillars) {
        const counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

        ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'].forEach(key => {
            const pillar = pillars[key];
            const stem = pillar.charAt(0);
            const branch = pillar.charAt(1);

            // 天干算 1 分
            const stemEl = getElementOf(stem);
            if (stemEl) counts[stemEl] += 1;

            // 地支藏干：主氣 1 分、中氣 0.5 分、餘氣 0.3 分
            const hiddenStems = BRANCH_HIDDEN_STEMS_FULL[branch] || [];
            hiddenStems.forEach((hs, idx) => {
                const el = getElementOf(hs);
                const weight = idx === 0 ? 1 : (idx === 1 ? 0.5 : 0.3);
                if (el) counts[el] += weight;
            });
        });

        // 四捨五入到 1 位小數
        Object.keys(counts).forEach(k => { counts[k] = Math.round(counts[k] * 10) / 10; });

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const percentages = {};
        Object.keys(counts).forEach(k => {
            percentages[k] = total > 0 ? Math.round((counts[k] / total) * 1000) / 10 : 0;
        });

        return { counts: counts, percentages: percentages, total: Math.round(total * 10) / 10 };
    }

    /**
     * 空亡計算
     */
    function calculateKongWang(dayPillar) {
        return KONG_WANG_RULES[dayPillar] || [];
    }

    /**
     * 流年 / 流月 / 流日 與日柱的五行互動（合、剋、衝、天剋地衝）
     * @param {string} dayPillar 本命日柱
     * @param {string} targetPillar 流年/流月/流日柱
     */
    function analyzeElementInteraction(dayPillar, targetPillar) {
        if (!dayPillar || !targetPillar) {
            return { stemAnalysis: '缺少分析資料', branchAnalysis: '', isMajorClash: false };
        }

        const dayStem = dayPillar.charAt(0);
        const dayBranch = dayPillar.charAt(1);
        const targetStem = targetPillar.charAt(0);
        const targetBranch = targetPillar.charAt(1);

        const stemRule = STEM_INTERACTIONS[dayStem];
        const branchRule = BRANCH_INTERACTIONS[dayBranch];

        let stemAnalysis = '天干無合剋';
        let branchAnalysis = '地支無合衝';
        let isMajorClash = false;

        if (stemRule.combinesWith === targetStem) {
            stemAnalysis = `天干${dayStem}${targetStem}相合`;
        } else if (stemRule.clashesWith === targetStem) {
            stemAnalysis = `天干${dayStem}${targetStem}相剋`;
        }

        if (branchRule.combinesWith === targetBranch) {
            branchAnalysis = `地支${dayBranch}${targetBranch}相合`;
        } else if (branchRule.clashesWith === targetBranch) {
            branchAnalysis = `地支${dayBranch}${targetBranch}相衝`;
        }

        if (stemRule.clashesWith === targetStem && branchRule.clashesWith === targetBranch) {
            isMajorClash = true;
        }

        return { stemAnalysis, branchAnalysis, isMajorClash };
    }

    /**
     * 流年/流月/流日 對日主的十神關係
     */
    function analyzeTenGodsInteraction(dayPillar, targetPillar) {
        const dayStem = dayPillar.charAt(0);
        const targetStem = targetPillar.charAt(0);
        const targetBranch = targetPillar.charAt(1);

        const stemTenGodName = getTenGod(dayStem, targetStem);
        const stemTenGodExplanation = TEN_GODS_EXPLANATIONS[stemTenGodName] || '';

        const hiddenStem = BRANCH_HIDDEN_STEMS[targetBranch];
        let branchTenGodName = '無藏干';
        let branchTenGodExplanation = '';
        if (hiddenStem) {
            branchTenGodName = getTenGod(dayStem, hiddenStem);
            branchTenGodExplanation = TEN_GODS_EXPLANATIONS[branchTenGodName] || '';
        }

        return {
            stem: { name: stemTenGodName, explanation: stemTenGodExplanation, character: targetStem },
            branch: { name: branchTenGodName, explanation: branchTenGodExplanation, character: targetBranch, hiddenStem: hiddenStem }
        };
    }

    /**
     * 查找未來 N 年的天剋地衝年份
     */
    function findTianKeDiChongYears(dayPillar, startYear, endYear) {
        const clashYears = [];
        for (let y = startYear; y <= endYear; y++) {
            const annualPillar = getAnnualPillar(y);
            const interaction = analyzeElementInteraction(dayPillar, annualPillar);
            if (interaction.isMajorClash) {
                clashYears.push({ year: y, annualPillar: annualPillar });
            }
        }
        return clashYears;
    }

    // ============================================================
    // 五、身強身弱（八分法）＋ 喜用神選用　★小六太乙師承版
    // ============================================================
    //
    // 八分法：八個字各 1 分、月令（月支）2 分，滿盤 9 分（奇數不打平）。
    //   我方（生扶）＝ 日主本身 ＋ 比劫(同我) ＋ 印(生我)
    //   敵方（剋洩耗）＝ 官殺(剋我) ＋ 食傷(我生) ＋ 財(我剋)
    //   敵我比數量：我方 > 敵方 → 身強；我方 < 敵方 → 身弱。
    //   地支一律以「本氣五行」計分（中氣餘氣不另拆）。
    //
    // 喜用神四層優先：① 調候 → ② 病藥 → ③ 強弱扶抑 → ④ 通關；從格另走順勢。
    //
    // ★ 標 TODO_NAKAI 者＝待你最後拍板的師承旋鈕，已先給暫定值，集中在頂端。

    const STRENGTH_CONFIG = {
        monthBranchWeight: 2,          // 月令權重（其餘各字 1）
        congWeakMaxSelf: 1,            // 明確從弱：我方只剩日主自身
        congCandidateMaxMinority: 2,   // 疑似從格：弱方／逆勢方最多 2 分
        congCandidateMinDominance: 0.75// 疑似從格：主勢至少占全局 75%
    };
    const TIAOHOU_CONFIG = {
        winter: ['亥', '子', '丑'],
        summer: ['巳', '午', '未'],
        winterNeeds: ['火', '木'],     // 暖局：火為主、木為輔
        summerNeeds: ['水', '金']      // 潤局：水為主、金為輔　TODO_NAKAI：主輔順序可調
    };
    const TONGGUAN_CONFIG = {
        minBothCounts: 2.5             // TODO_NAKAI：兩行皆 ≥ 此量且相剋才啟用通關
    };
    const ZHUAN_WANG_NAMES = { '木':'曲直格', '火':'炎上格', '土':'稼穡格', '金':'從革格', '水':'潤下格' };
    const HUA_QI_BY_DAY_STEM = {
        '甲':{partner:'己',element:'土',pattern:'甲己化土格'}, '己':{partner:'甲',element:'土',pattern:'甲己化土格'},
        '乙':{partner:'庚',element:'金',pattern:'乙庚化金格'}, '庚':{partner:'乙',element:'金',pattern:'乙庚化金格'},
        '丙':{partner:'辛',element:'水',pattern:'丙辛化水格'}, '辛':{partner:'丙',element:'水',pattern:'丙辛化水格'},
        '丁':{partner:'壬',element:'木',pattern:'丁壬化木格'}, '壬':{partner:'丁',element:'木',pattern:'丁壬化木格'},
        '戊':{partner:'癸',element:'火',pattern:'戊癸化火格'}, '癸':{partner:'戊',element:'火',pattern:'戊癸化火格'}
    };
    const JIAN_LU_BRANCH = { '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子' };
    const YANG_REN_BRANCH = { '甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子' };
    const REGULAR_MONTH_GODS = ['正官','七殺','正財','偏財','正印','偏印','食神','傷官'];
    const TIAN_YI_BRANCHES = {
        '甲':['丑','未'],'戊':['丑','未'],'庚':['丑','未'], '乙':['子','申'],'己':['子','申'],
        '丙':['亥','酉'],'丁':['亥','酉'], '壬':['卯','巳'],'癸':['卯','巳'], '辛':['寅','午']
    };

    // —— 小工具 ——
    function _uniq(a) { return a.filter((x, i) => x && a.indexOf(x) === i); }
    function _generatorOf(el) { return Object.keys(ELEMENT_GENERATES).find(k => ELEMENT_GENERATES[k] === el) || null; } // 生 el 之行（印）
    function _overcomerOf(el) { return Object.keys(ELEMENT_OVERCOMES).find(k => ELEMENT_OVERCOMES[k] === el) || null; } // 剋 el 之行
    const _ALL_EL = ['木', '火', '土', '金', '水'];

    // 收集全盤「有效五行」：天干＋地支藏干；地支被沖或被合者，其藏干一律作廢。（供調候閘二用）
    function _collectValidElements(pillars) {
        const stems = [pillars.yearPillar.charAt(0), pillars.monthPillar.charAt(0), pillars.dayPillar.charAt(0), pillars.hourPillar.charAt(0)];
        const branches = [pillars.yearPillar.charAt(1), pillars.monthPillar.charAt(1), pillars.dayPillar.charAt(1), pillars.hourPillar.charAt(1)];
        const set = new Set();
        stems.forEach(st => { const e = getElementOf(st); if (e) set.add(e); });
        branches.forEach((b, idx) => {
            const rule = BRANCH_INTERACTIONS[b] || {};
            const clashed = branches.some((bb, j) => j !== idx && bb === rule.clashesWith);
            const combined = branches.some((bb, j) => j !== idx && bb === rule.combinesWith);
            if (clashed || combined) return; // 沖或合 → 該支藏干作廢
            (BRANCH_HIDDEN_STEMS_FULL[b] || []).forEach(hs => { const e = getElementOf(hs); if (e) set.add(e); });
        });
        return set;
    }

    // 從格三級偵測：正格／疑似從格／明確從格。
    // 疑似從格只保存順勢喜忌備選，不直接翻轉主曲線；只有明確從格才正式順勢取用。
    // 財是否存活（師承 2026-09-28）：
    //   地支財以前置結算後的 byElement 為準（被沖折損、合化轉出後歸零即不存活）；
    //   天干財不進前置結算，另判：與相鄰天干五合者視為被合化（TODO_NAKAI：天干合化是否另需化神條件）。
    function _survivingCai(pillars, dayEl, byElement) {
        const caiEl = ELEMENT_OVERCOMES[dayEl];
        const S = [pillars.yearPillar.charAt(0), pillars.monthPillar.charAt(0), pillars.dayPillar.charAt(0), pillars.hourPillar.charAt(0)];
        const ROLE = ['年干', '月干', '日干', '時干'], ADJ = { 0: [1], 1: [0, 2], 3: [2] };
        const stemCai = [0, 1, 3].filter(i => getElementOf(S[i]) === caiEl);
        const combined = stemCai.filter(i => ADJ[i].some(j => STEM_INTERACTIONS[S[i]] && STEM_INTERACTIONS[S[i]].combinesWith === S[j]));
        const branchCai = Math.max(0, (byElement[caiEl] || 0) - stemCai.length);
        const liveStems = stemCai.filter(i => combined.indexOf(i) === -1);
        return {
            caiEl: caiEl, surviving: liveStems.length > 0 || branchCai > 0,
            liveStems: liveStems.map(i => ROLE[i] + S[i]), combinedStems: combined.map(i => ROLE[i] + S[i]),
            branchScoreAfterSettlement: branchCai
        };
    }

    function _detectCongGe(pillars, dayEl, selfScore, foeScore, byElement) {
        const branchRoles = [
            { role:'年', branch:pillars.yearPillar.charAt(1), weight:1 },
            { role:'月', branch:pillars.monthPillar.charAt(1), weight:STRENGTH_CONFIG.monthBranchWeight },
            { role:'日', branch:pillars.dayPillar.charAt(1), weight:1 },
            { role:'時', branch:pillars.hourPillar.charAt(1), weight:1 }
        ];
        const branches = branchRoles.map(x => x.branch);
        const otherStems = [pillars.yearPillar.charAt(0), pillars.monthPillar.charAt(0), pillars.hourPillar.charAt(0)];
        const branchEls = branches.map(getElementOf);

        function rooted(idx) {
            const b = branches[idx], rule = BRANCH_INTERACTIONS[b] || {};
            const combined = branches.some((bb, j) => j !== idx && bb === rule.combinesWith);            // 被合
            const clashed = branches.some((bb, j) => j !== idx && bb === rule.clashesWith);               // 被沖
            const myEl = getElementOf(b);
            const overcome = branchEls.some((el, j) => j !== idx && el && ELEMENT_OVERCOMES[el] === myEl); // 被剋（地支相剋）
            if (combined || clashed || overcome) return false;                                            // 被剋/沖/合 → 無根
            return (BRANCH_HIDDEN_STEMS_FULL[b] || []).some(hs => {
                const r = getElementRelation(dayEl, getElementOf(hs));
                return r === '同我' || r === '生我'; // 藏比劫/印 → 有根
            });
        }
        const stemSupport = otherStems.filter(st => { const r=getElementRelation(dayEl,getElementOf(st)); return r==='同我'||r==='生我'; });
        const effectiveRoots = branchRoles.filter((x,idx) => rooted(idx));
        const supportUnits = stemSupport.length + effectiveRoots.reduce((n,x) => n + x.weight, 0);
        const stemFoes = otherStems.filter(st => { const r=getElementRelation(dayEl,getElementOf(st)); return r!=='同我'&&r!=='生我'; });
        const branchFoes = branchRoles.filter(x => { const r=getElementRelation(dayEl,getElementOf(x.branch)); return r!=='同我'&&r!=='生我'; });
        const foeUnits = stemFoes.length + branchFoes.reduce((n,x) => n + x.weight, 0);
        const total = Math.max(0.0001, selfScore + foeScore);
        const weakDominance = foeScore / total;
        const strongDominance = selfScore / total;
        const foeElements = _ALL_EL.filter(e => {
            const r=getElementRelation(dayEl,e);
            return r!=='同我'&&r!=='生我'&&(byElement[e]||0)>0;
        }).sort((a,b) => (byElement[b]||0)-(byElement[a]||0));
        const dominant = foeElements[0] || null;
        const dominantRel = dominant ? getElementRelation(dayEl,dominant) : null;
        const second = foeElements[1] || null;
        const mixed势 = dominant && second && (byElement[second]||0) >= (byElement[dominant]||0)*0.85 &&
            getElementRelation(dayEl,second)!==dominantRel;
        const weakPattern = mixed势 ? '從勢格' : (dominantRel==='我生'?'從兒格':dominantRel==='我剋'?'從財格':dominantRel==='剋我'?'從官殺格':'從勢格');
        const common = {
            dominanceRatio: Math.round(Math.max(weakDominance,strongDominance)*1000)/1000,
            selfScore:selfScore, foeScore:foeScore,
            dominantElement:dominant,
            support:{ stems:stemSupport.slice(), roots:effectiveRoots.map(x => ({role:x.role,branch:x.branch,weight:x.weight})), units:supportUnits },
            opposition:{ stems:stemFoes.slice(), branches:branchFoes.map(x => ({role:x.role,branch:x.branch,weight:x.weight})), units:foeUnits },
            thresholds:{ clearWeakMaxSelf:STRENGTH_CONFIG.congWeakMaxSelf, candidateMaxMinority:STRENGTH_CONFIG.congCandidateMaxMinority, candidateMinDominance:STRENGTH_CONFIG.congCandidateMinDominance }
        };
        function result(status,type,pattern,evidence,counterEvidence,summary) {
            return Object.assign({},common,{status:status,type:type,pattern:pattern||null,active:status==='明確從格',
                evidence:evidence||[],counterEvidence:counterEvidence||[],summary:summary});
        }

        if (!stemSupport.length && !effectiveRoots.length && selfScore <= STRENGTH_CONFIG.congWeakMaxSelf) {
            return result('明確從格','從弱',weakPattern,
                ['日主我方僅 '+selfScore+' 分','天干無印比援助','地支無有效根','敵方占 '+Math.round(weakDominance*100)+'%'],[],
                '日主孤弱無根且敵方成勢，判為明確'+weakPattern+'；正式順勢取用。');
        }
        if (selfScore <= STRENGTH_CONFIG.congCandidateMaxMinority && weakDominance >= STRENGTH_CONFIG.congCandidateMinDominance &&
            !effectiveRoots.some(x => x.role==='月') && supportUnits <= 1) {
            const counter=[];
            if(stemSupport.length) counter.push('仍有孤立印比透干：'+stemSupport.join('、'));
            if(effectiveRoots.length) counter.push('仍有弱根：'+effectiveRoots.map(x=>x.role+'支'+x.branch).join('、'));
            return result('疑似從格','從弱',weakPattern,
                ['敵方占 '+Math.round(weakDominance*100)+'%','月令無有效印比根','生扶總量僅 '+selfScore+' 分'],counter,
                '敵方已成明顯主勢，但仍留一處孤援，列為疑似'+weakPattern+'；主曲線暫按正格，另存順勢喜忌備選。');
        }
        // ★師承 2026-09-28：印生我、屬我方；滿盤我方（比劫＋印）不作從格，改歸專旺家族「專旺我」。
        //   門檻沿用原「從強」口徑不變；喜忌亦沿用（印比喜，食傷財官殺忌）。財、食傷可否容許 TODO_NAKAI。
        //   此處只產出判定資料，交由 _detectZhuanWang 併入專旺格。
        let yinBi = null;
        if (foeScore === 0 && _survivingCai(pillars, dayEl, byElement).surviving) {
            // ★師承 2026-09-28：財存活即不作專旺我（防結算重複折損使敵方總分歸零而財仍在）
            const cai = _survivingCai(pillars, dayEl, byElement);
            return Object.assign(result('正格',null,null,
                ['我方（比劫＋印）成勢，但財「'+cai.caiEl+'」未被合化、未被沖掉'],[],
                '比劫與印成勢而財仍存活；依師承不列專旺我或從格，維持正格病藥。'),
                {caiBlocksZhuanWang:cai});
        }
        if (foeScore === 0) {
            yinBi = {status:'明確專旺',
                evidence:['全局敵方為 0 分','生扶占 100%','無財官食傷逆勢'],counterEvidence:[],
                summary:'滿盤比劫與印、完全無逆勢；印生我屬我方，依師承不作從格，判為明確專旺我，順我方之勢取用。'};
        } else if (foeScore <= STRENGTH_CONFIG.congCandidateMaxMinority && strongDominance >= STRENGTH_CONFIG.congCandidateMinDominance &&
            !branchFoes.some(x => x.role==='月') && foeUnits <= 1 && _survivingCai(pillars, dayEl, byElement).surviving) {
            // ★師承 2026-09-28：我方滿盤而財仍存活（未被合化、未被沖掉）→ 不是專旺格也不是從格，回正格病藥（喜財）
            const cai = _survivingCai(pillars, dayEl, byElement);
            return Object.assign(result('正格',null,null,
                ['我方（比劫＋印）成勢，但財「'+cai.caiEl+'」未被合化、未被沖掉'],[],
                '比劫與印成勢而財仍存活；依師承不列專旺我或從格，維持正格，以病藥取財為用。'),
                {caiBlocksZhuanWang:cai});
        } else if (foeScore <= STRENGTH_CONFIG.congCandidateMaxMinority && strongDominance >= STRENGTH_CONFIG.congCandidateMinDominance &&
            !branchFoes.some(x => x.role==='月') && foeUnits <= 1) {
            yinBi = {status:'疑似專旺',
                evidence:['生扶占 '+Math.round(strongDominance*100)+'%','月令不屬逆勢','逆勢總量僅 '+foeScore+' 分'],
                counterEvidence:['仍有孤立逆勢：'+stemFoes.concat(branchFoes.map(x=>x.role+'支'+x.branch)).join('、')],
                summary:'比劫與印已成明顯主勢，但仍見一處孤立逆勢，列為疑似專旺我；主曲線暫按正格，另存順勢喜忌備選。'};
        }
        if (yinBi) {
            return Object.assign(result('正格',null,null,
                ['我方（比劫＋印）成勢，屬專旺我範疇，不列從格'],[],
                '生扶一方成勢；依師承（印生我屬我方）歸專旺格判定，不作從格。'),
                {yinBiZhuanWang:Object.assign({type:'專旺',subtype:'專旺我',pattern:'專旺我',element:dayEl,
                    dominanceRatio:Math.round(strongDominance*1000)/1000,selfScore:selfScore,foeScore:foeScore},yinBi)});
        }
        return result('正格',null,null,
            ['未同時通過從格的極端失衡、月令與孤援條件'],[],
            '日主仍有足以自立的根援，或逆勢尚未退盡，維持正格判定。');
    }

    // 專旺五格：日主本行取得月令與地支主勢，官殺不成氣候；疑似格只留備選喜忌。
    function _detectZhuanWang(pillars, dayEl, byElement, cong) {
        const oneLine=_detectZhuanWangOneLine(pillars, dayEl, byElement);
        const variants=[oneLine];
        const yb=cong&&cong.yinBiZhuanWang;
        if(yb) variants.push(Object.assign({active:yb.status==='明確專旺'},yb));
        const rank=x=>x.status==='明確專旺'?2:(x.status==='疑似專旺'?1:0);
        const primary=variants.reduce((a,b)=>rank(b)>rank(a)?b:a); // 同級時一行型優先
        return Object.assign({},primary,{subtype:primary.subtype||'一行型',variants:variants});
    }

    // 一行型專旺五格（原 _detectZhuanWang 本體，未改）
    function _detectZhuanWangOneLine(pillars, dayEl, byElement) {
        const pattern=ZHUAN_WANG_NAMES[dayEl];
        const monthBranch=pillars.monthPillar.charAt(1), monthEl=getElementOf(monthBranch);
        const branches=[pillars.yearPillar.charAt(1),monthBranch,pillars.dayPillar.charAt(1),pillars.hourPillar.charAt(1)];
        const weights=[1,STRENGTH_CONFIG.monthBranchWeight,1,1];
        const total=Math.max(0.0001,_ALL_EL.reduce((n,e)=>n+(byElement[e]||0),0));
        const ratio=(byElement[dayEl]||0)/total;
        const officerEl=_overcomerOf(dayEl), officerScore=byElement[officerEl]||0;
        const branchWeight=branches.reduce((n,b,i)=>n+(getElementOf(b)===dayEl?weights[i]:0),0);
        const dominant=_ALL_EL.slice().sort((a,b)=>(byElement[b]||0)-(byElement[a]||0))[0];
        const monthSame=monthEl===dayEl, monthSupports=monthSame||monthEl===_generatorOf(dayEl);
        const evidence=['日主本行占 '+Math.round(ratio*100)+'%','同氣地支權重 '+branchWeight+'/5','官殺「'+officerEl+'」'+officerScore+' 分'];
        const common={type:'專旺',subtype:'一行型',pattern:pattern,element:dayEl,dominanceRatio:Math.round(ratio*1000)/1000,
            branchWeight:branchWeight,monthElement:monthEl,officerElement:officerEl,officerScore:officerScore,
            thresholds:{clearRatio:0.8,candidateRatio:0.6,clearBranchWeight:4,candidateBranchWeight:3}};
        function result(status,counter,summary){return Object.assign({},common,{status:status,active:status==='明確專旺',evidence:evidence,counterEvidence:counter||[],summary:summary});}
        // ★師承 2026-09-28（依千里命稿外格篇）：一行型逢財，有食傷則不妨；見存活之財而無食傷引通 → 降為疑似。
        const caiLive=_survivingCai(pillars, dayEl, byElement);
        const shiShangEl=ELEMENT_GENERATES[dayEl], shiShangScore=byElement[shiShangEl]||0;
        const caiUnbridged=caiLive.surviving&&shiShangScore<=0;
        if(ratio>=0.8&&monthSame&&branchWeight>=4&&officerScore===0&&!caiUnbridged){
            return result('明確專旺',[],pattern+'本行得月令、根氣集中且官殺全無，正式依專旺順勢取用。'+
                (caiLive.surviving?'盤中見財，有食傷「'+shiShangEl+'」引通（千里：逢財有食傷則不妨）。':''));
        }
        if(ratio>=0.8&&monthSame&&branchWeight>=4&&officerScore===0&&caiUnbridged){
            return Object.assign(result('疑似專旺',['見財「'+caiLive.caiEl+'」而無食傷「'+shiShangEl+'」引通（千里：逢財有食傷則不妨）'],
                pattern+'本行成勢且官殺全無，但財存活而無食傷引通；依千里降為疑似，主曲線按正格，另存專旺喜忌備選。'),
                {caiUnbridged:{caiEl:caiLive.caiEl,shiShangEl:shiShangEl,liveStems:caiLive.liveStems,branchScoreAfterSettlement:caiLive.branchScoreAfterSettlement}});
        }
        if(ratio>=0.6&&dominant===dayEl&&monthSupports&&branchWeight>=3&&officerScore<=1){
            const counter=[];
            if(!monthSame)counter.push('月令僅生扶本行，並非本行當令');
            if(officerScore>0)counter.push('仍見孤立官殺 '+officerScore+' 分');
            if(ratio<0.8)counter.push('本行純度未達 80%');
            return result('疑似專旺',counter,pattern+'已形成主勢但仍有雜氣或逆勢，主曲線暫按正格，另存專旺喜忌備選。');
        }
        return result('正格',['未同時通過本行純度、月令、地支根氣及官殺門檻'],'日主本行尚未形成足以獨立取用的專旺氣勢。');
    }

    // 五種化氣格：日干必須見合伴，並檢查鄰合、月令、化神純度、原日主殘氣與破化五行。
    function _detectHuaQi(pillars, dayEl, byElement) {
        const dayStem=pillars.dayPillar.charAt(0), rule=HUA_QI_BY_DAY_STEM[dayStem];
        const stems=[
            {role:'年',stem:pillars.yearPillar.charAt(0),adjacent:false},
            {role:'月',stem:pillars.monthPillar.charAt(0),adjacent:true},
            {role:'時',stem:pillars.hourPillar.charAt(0),adjacent:true}
        ];
        const partners=stems.filter(x=>x.stem===rule.partner), sameDay=stems.filter(x=>x.stem===dayStem);
        const monthEl=getElementOf(pillars.monthPillar.charAt(1));
        const total=Math.max(0.0001,_ALL_EL.reduce((n,e)=>n+(byElement[e]||0),0));
        const huaRatio=(byElement[rule.element]||0)/total;
        const rawOriginRatio=(byElement[dayEl]||0)/total;
        const originSameAsHua=dayEl===rule.element;
        const originRatio=originSameAsHua?0:rawOriginRatio; // 己日化土、庚日化金：日主本行即化神，不視為殘氣破化
        const breaker=_overcomerOf(rule.element), breakerScore=byElement[breaker]||0;
        const monthSupports=monthEl===rule.element||monthEl===_generatorOf(rule.element);
        const dominant=_ALL_EL.slice().sort((a,b)=>(byElement[b]||0)-(byElement[a]||0))[0];
        const adjacent=partners.some(x=>x.adjacent);
        const evidence=['日干見合伴「'+rule.partner+'」'+partners.length+' 位','化神「'+rule.element+'」占 '+Math.round(huaRatio*100)+'%',
            (originSameAsHua?'日主本行與化神同氣':'原日主本行占 '+Math.round(originRatio*100)+'%'),'破化五行「'+breaker+'」'+breakerScore+' 分'];
        const common={type:'化氣',pattern:rule.pattern,dayStem:dayStem,partnerStem:rule.partner,element:rule.element,
            partnerRoles:partners.map(x=>x.role),adjacent:adjacent,monthElement:monthEl,monthSupports:monthSupports,
            dominanceRatio:Math.round(huaRatio*1000)/1000,originRatio:Math.round(originRatio*1000)/1000,originSameAsHua:originSameAsHua,
            breakerElement:breaker,breakerScore:breakerScore,
            thresholds:{clearRatio:0.65,candidateRatio:0.4,clearOriginMax:0.2,candidateOriginMax:0.35}};
        function result(status,counter,summary){return Object.assign({},common,{status:status,active:status==='明確化氣',evidence:evidence,counterEvidence:counter||[],summary:summary});}
        if(partners.length===1&&adjacent&&sameDay.length===0&&monthSupports&&huaRatio>=0.65&&originRatio<=0.2&&breakerScore<=1){
            return result('明確化氣',[],rule.pattern+'合伴緊鄰日主、化神得月令成勢，且原日主與破化五行皆弱，正式依化神取用。');
        }
        if(partners.length>=1&&(monthSupports||dominant===rule.element)&&huaRatio>=0.4&&originRatio<=0.35&&breakerScore<=2&&sameDay.length<=1){
            const counter=[];
            if(!adjacent)counter.push('合伴不鄰日主');
            if(partners.length>1)counter.push('合伴重見，存在爭合');
            if(sameDay.length)counter.push('同日干重見，存在妒合');
            if(!monthSupports)counter.push('化神未直接得月令生扶');
            if(huaRatio<0.65)counter.push('化神純度未達 65%');
            return result('疑似化氣',counter,rule.pattern+'具備合化主勢但仍有爭合、月令或純度疑點，主曲線暫按正格，另存化氣喜忌備選。');
        }
        return result('正格',partners.length?['合化未通過月令、化神純度、原日主殘氣或破化門檻']:['日干未見五合合伴'],
            partners.length?'雖見天干五合，但尚不足以成立化氣格。':'日干無合伴，維持非化氣格。');
    }

    // 建祿／月刃只作月令格局標記，不單獨翻轉喜忌；陽干帝旺月才列月刃格。
    function _detectMonthPattern(pillars) {
        const dayStem=pillars.dayPillar.charAt(0), monthBranch=pillars.monthPillar.charAt(1);
        if(JIAN_LU_BRANCH[dayStem]===monthBranch){
            return {status:'成立',type:'建祿格',dayStem:dayStem,monthBranch:monthBranch,affectsCurve:false,
                summary:'日主祿位落在月令，成立建祿格；仍依全局旺衰與喜用神取用，不單獨翻轉曲線。'};
        }
        if(YANG_REN_BRANCH[dayStem]===monthBranch){
            return {status:'成立',type:'月刃格',dayStem:dayStem,monthBranch:monthBranch,affectsCurve:false,
                summary:'陽日主帝旺羊刃落在月令，成立月刃格；記錄制刃／洩秀線索，但仍依全局喜用神計分。'};
        }
        return {status:'未成立',type:null,dayStem:dayStem,monthBranch:monthBranch,affectsCurve:false,
            summary:'月令不在日主建祿或陽刃位置。'};
    }

    // 月令八種正格：先定月令藏干之取格來源，再依《子平真詮》的成、敗、救應結構做可追溯判斷。
    // 本版只作格局解讀，不直接改寫喜用神或曲線；待人生應證後再決定是否入分。
    function _detectRegularMonthPattern(pillars, selfScore, foeScore, monthPattern) {
        const dayStem=pillars.dayPillar.charAt(0), dayEl=getElementOf(dayStem);
        const monthBranch=pillars.monthPillar.charAt(1);
        const hidden=(BRANCH_HIDDEN_STEMS_FULL[monthBranch]||[]).slice();
        const layerNames=['主氣','中氣','餘氣'];
        const visibleRows=[
            {role:'年干',stem:pillars.yearPillar.charAt(0)},
            {role:'月干',stem:pillars.monthPillar.charAt(0)},
            {role:'時干',stem:pillars.hourPillar.charAt(0)}
        ];
        const hiddenRows=hidden.map((stem,index)=>({
            stem:stem,index:index,layer:layerNames[index]||('第 '+(index+1)+' 氣'),tenGod:getTenGod(dayStem,stem),
            exposedAt:visibleRows.filter(x=>x.stem===stem).map(x=>x.role)
        }));
        const main=hiddenRows[0]||null;
        const common={monthBranch:monthBranch,hiddenStems:hiddenRows,affectsCurve:false,
            note:'月令正格與成敗救應目前只作結構解讀，不參與喜用神、大運或流年曲線計分。'};

        // 建祿／月刃以比劫當令為體，不再被雜氣透干誤取為八格。
        if(main && (main.tenGod==='比肩'||main.tenGod==='劫財')){
            const replacement=monthPattern&&monthPattern.status==='成立'?monthPattern.type:null;
            return Object.assign({},common,{status:replacement?'由建祿／月刃取代':'取格條件不足',pattern:replacement,
                tenGod:main.tenGod,sourceStem:main.stem,sourcePosition:'月令主氣為'+main.tenGod,verdict:'非八種正格',
                activeSuccess:[],activeFailures:[],activeRescues:[],unresolvedFailures:[],
                summary:replacement?'月令主氣為'+main.tenGod+'，本盤沿用'+replacement+'，不重複取八種正格。':'月令主氣為'+main.tenGod+'，且不屬已定義的建祿／月刃，本版不勉強取八格。'});
        }

        const exposedCandidates=hiddenRows.filter(x=>REGULAR_MONTH_GODS.indexOf(x.tenGod)!==-1&&x.exposedAt.length);
        let selected=exposedCandidates.length?exposedCandidates[0]:null;
        if(!selected&&main&&REGULAR_MONTH_GODS.indexOf(main.tenGod)!==-1) selected=main;
        if(!selected){
            return Object.assign({},common,{status:'取格條件不足',pattern:null,tenGod:main&&main.tenGod,
                sourceStem:main&&main.stem,sourcePosition:'月令未取得八格用神',verdict:'待核',
                activeSuccess:[],activeFailures:[],activeRescues:[],unresolvedFailures:[],
                summary:'月令藏干未出現可依「透干優先、主氣藏用」取得的八種正格，保留待核。'});
        }

        const pattern=selected.tenGod+'格';
        const isExposed=selected.exposedAt.length>0;
        const sourcePosition='月令'+selected.layer+(isExposed?'透干（'+selected.exposedAt.join('、')+'）':'藏用');

        // 十神強度：天干各1；地支以主／中／餘氣 1／0.5／0.3，月支再乘 2。
        const counts={};
        function addCount(god,weight){ if(god&&god!=='未知') counts[god]=(counts[god]||0)+weight; }
        visibleRows.forEach(x=>addCount(getTenGod(dayStem,x.stem),1));
        const branchRows=[pillars.yearPillar,pillars.monthPillar,pillars.dayPillar,pillars.hourPillar];
        branchRows.forEach((gz,bi)=>{
            const bw=bi===1?2:1;
            (BRANCH_HIDDEN_STEMS_FULL[gz.charAt(1)]||[]).forEach((stem,hi)=>addCount(getTenGod(dayStem,stem),bw*([1,0.5,0.3][hi]||0.2)));
        });
        function godCount(gods){
            const list=Array.isArray(gods)?gods:[gods];
            return list.reduce((n,g)=>n+(counts[g]||0),0);
        }
        function has(gods){return godCount(gods)>0;}
        function visible(gods){
            const list=Array.isArray(gods)?gods:[gods];
            return visibleRows.some(x=>list.indexOf(getTenGod(dayStem,x.stem))!==-1);
        }
        function strongGod(god){return visible(god)||godCount(god)>=1.5;}
        const allStems=[pillars.yearPillar.charAt(0),pillars.monthPillar.charAt(0),dayStem,pillars.hourPillar.charAt(0)];
        function combinedAway(god){
            return visibleRows.filter(x=>getTenGod(dayStem,x.stem)===god).some(x=>
                allStems.some(st=>st!==x.stem&&STEM_INTERACTIONS[x.stem]&&STEM_INTERACTIONS[x.stem].combinesWith===st));
        }
        const monthRule=BRANCH_INTERACTIONS[monthBranch]||{};
        const allBranches=branchRows.map(gz=>gz.charAt(1));
        const monthClashed=allBranches.some((b,i)=>i!==1&&b===monthRule.clashesWith);
        const bodyStrong=selfScore>foeScore, bodyWeak=!bodyStrong;
        const hasCai=has(['正財','偏財']), hasYin=has(['正印','偏印']);
        const hasOutput=has(['食神','傷官']), hasBi=has(['比肩','劫財']);
        const hasGuan=has('正官'), hasSha=has('七殺');
        const caiCount=godCount(['正財','偏財']), yinCount=godCount(['正印','偏印']);
        const biCount=godCount(['比肩','劫財']);
        function sig(key,label,met,rescuedBy){return {key:key,label:label,met:!!met,rescuedBy:rescuedBy||[]};}
        function rescue(key,label,met){return {key:key,label:label,met:!!met};}
        let success=[],failures=[],rescues=[];

        if(selected.tenGod==='正官'){
            success=[sig('wealth_birth_officer','財星生官',hasCai),sig('seal_protect_officer','印綬護官',hasYin),
                sig('officer_pure','官星清純，不見七殺透干',!visible('七殺'))];
            failures=[sig('hurt_officer','傷官見官',strongGod('傷官'),['seal_control_hurt','wealth_bridge']),
                sig('officer_kill_mixed','官殺混雜',visible('七殺'),['combine_kill_keep_officer'])];
            rescues=[rescue('seal_control_hurt','印制傷官、保護官星',strongGod('傷官')&&hasYin),
                rescue('wealth_bridge','傷官生財、財再生官通關',strongGod('傷官')&&hasCai),
                rescue('combine_kill_keep_officer','合殺留官',visible('七殺')&&combinedAway('七殺'))];
        } else if(selected.tenGod==='七殺'){
            success=[sig('body_carries_kill','身強能任殺',bodyStrong),sig('output_controls_kill','食傷制殺',hasOutput),
                sig('kill_seal_flow','殺印相生',hasYin),sig('kill_pure','七殺清純，不見正官透干',!visible('正官'))];
            failures=[sig('weak_meets_kill','身弱殺重',bodyWeak,['seal_transforms_kill','peer_supports_body']),
                sig('wealth_feeds_kill','財滋殺而無制化',hasCai&&!hasOutput&&!hasYin,['output_controls_kill_rescue','seal_transforms_kill']),
                sig('kill_officer_mixed','官殺混雜',visible('正官'),['combine_officer_keep_kill'])];
            rescues=[rescue('output_controls_kill_rescue','食傷制殺',hasOutput),rescue('seal_transforms_kill','印星化殺生身',hasYin),
                rescue('peer_supports_body','比劫幫身任殺',bodyWeak&&hasBi),
                rescue('combine_officer_keep_kill','合官留殺',visible('正官')&&combinedAway('正官'))];
        } else if(selected.tenGod==='正財'||selected.tenGod==='偏財'){
            const biHeavy=biCount>=Math.max(1.5,caiCount*0.9);
            success=[sig('body_carries_wealth','身強能任財',bodyStrong),sig('output_birth_wealth','食傷生財',hasOutput),
                sig('wealth_birth_officer','財生正官',hasGuan)];
            failures=[sig('weak_many_wealth','身弱財多',bodyWeak,['seal_supports_body']),
                sig('peer_robs_wealth','財輕比劫重，有奪財之象',biHeavy,['output_turns_peer','officer_controls_peer']),
                sig('wealth_reveals_kill','財格透七殺',visible('七殺'),['food_controls_kill','combine_kill'])];
            rescues=[rescue('seal_supports_body','印星扶身任財',bodyWeak&&hasYin),
                rescue('output_turns_peer','食傷化比劫而生財',biHeavy&&hasOutput),
                rescue('officer_controls_peer','正官制比劫護財',biHeavy&&hasGuan),
                rescue('food_controls_kill','食神制殺',visible('七殺')&&strongGod('食神')),
                rescue('combine_kill','合去七殺',visible('七殺')&&combinedAway('七殺'))];
        } else if(selected.tenGod==='正印'||selected.tenGod==='偏印'){
            const wealthBreaks=visible(['正財','偏財'])||caiCount>yinCount;
            const heavySeal=yinCount>=3;
            success=[sig('officer_birth_seal','官殺生印',hasGuan||hasSha),sig('weak_receives_seal','身弱得印生扶',bodyWeak),
                sig('strong_seal_output','身印兩旺，有食傷洩秀',bodyStrong&&hasOutput)];
            failures=[sig('wealth_breaks_seal','財星壞印',wealthBreaks,['peer_controls_wealth']),
                sig('strong_heavy_seal_kill','身強印重又透殺',bodyStrong&&heavySeal&&visible('七殺'),['output_drains_strength'])];
            rescues=[rescue('peer_controls_wealth','比劫制財護印',wealthBreaks&&hasBi),
                rescue('output_drains_strength','食傷洩秀，疏導身印過旺',bodyStrong&&hasOutput)];
            if(selected.tenGod==='偏印'){
                failures.push(sig('owl_takes_food','偏印奪食',strongGod('食神'),['wealth_controls_owl']));
                rescues.push(rescue('wealth_controls_owl','財星制梟、保護食神',strongGod('食神')&&hasCai));
            }
        } else if(selected.tenGod==='食神'){
            success=[sig('food_birth_wealth','食神生財',hasCai),sig('food_controls_kill','食神制殺',hasSha),
                sig('body_can_release','身強可任食神洩秀',bodyStrong)];
            failures=[sig('owl_takes_food','偏印奪食',strongGod('偏印'),['wealth_controls_owl']),
                sig('food_wealth_kill','食神生財又露殺',hasCai&&visible('七殺'),['combine_kill_keep_food']),
                sig('weak_over_releases','身弱洩氣過重',bodyWeak,['peer_supports_food'])];
            rescues=[rescue('wealth_controls_owl','財星制梟、保護食神',strongGod('偏印')&&hasCai),
                rescue('combine_kill_keep_food','合殺留食',visible('七殺')&&combinedAway('七殺')),
                rescue('peer_supports_food','比劫扶身生食',bodyWeak&&hasBi),
                rescue('abandon_food_for_kill','棄食就殺，透印化殺',hasSha&&hasYin&&!hasCai)];
        } else if(selected.tenGod==='傷官'){
            const jinShui=dayEl==='金'&&['亥','子'].indexOf(monthBranch)!==-1;
            const officerThreat=strongGod('正官')&&!jinShui;
            success=[sig('hurt_birth_wealth','傷官生財',hasCai),sig('hurt_with_seal','傷官配印',hasYin),
                sig('hurt_controls_kill','傷官制殺',hasSha),sig('metal_water_officer','金水傷官見官可參調候',jinShui&&hasGuan)];
            failures=[sig('hurt_meets_officer','傷官見官',officerThreat,['seal_controls_hurt','wealth_bridges_officer']),
                sig('weak_over_releases','身弱傷官洩氣過重',bodyWeak,['seal_supports_hurt','peer_supports_hurt']),
                sig('hurt_wealth_kill_weak','傷官生財帶殺而身輕',bodyWeak&&hasCai&&hasSha,['kill_seal_rescue'])];
            rescues=[rescue('seal_controls_hurt','印制傷官、保護官星',officerThreat&&hasYin),
                rescue('wealth_bridges_officer','傷官生財、財生官通關',officerThreat&&hasCai),
                rescue('seal_supports_hurt','印星制傷並扶身',bodyWeak&&hasYin),
                rescue('peer_supports_hurt','比劫扶身任洩',bodyWeak&&hasBi),
                rescue('kill_seal_rescue','殺印相生，化殺扶身',bodyWeak&&hasSha&&hasYin)];
        }

        failures.push(sig('month_command_clash','月令受沖，格局根氣不穩',monthClashed,[]));
        success.push(sig('month_command_stable','月令未受六沖',!monthClashed));
        const activeSuccess=success.filter(x=>x.met);
        const activeFailures=failures.filter(x=>x.met);
        const activeRescues=rescues.filter(r=>r.met&&activeFailures.some(f=>f.rescuedBy.indexOf(r.key)!==-1));
        const unresolvedFailures=activeFailures.filter(f=>!f.rescuedBy.length||!f.rescuedBy.some(k=>activeRescues.some(r=>r.key===k)));
        let verdict;
        if(!activeFailures.length) verdict=activeSuccess.length?'成格':'成格條件不足';
        else if(!unresolvedFailures.length) verdict='敗中有救';
        else if(activeRescues.length) verdict='成中有敗';
        else verdict='破格待救';
        const roundedCounts={}; Object.keys(counts).forEach(k=>roundedCounts[k]=Math.round(counts[k]*100)/100);
        const summary=sourcePosition+'取「'+pattern+'」，判為'+verdict+'。'+
            (activeFailures.length?'破格線索：'+activeFailures.map(x=>x.label).join('、')+'。':'未見明顯破格線索。')+
            (activeRescues.length?'救應：'+activeRescues.map(x=>x.label).join('、')+'。':'');
        return Object.assign({},common,{status:'已取格',pattern:pattern,tenGod:selected.tenGod,sourceStem:selected.stem,
            sourceLayer:selected.layer,sourceExposed:isExposed,sourceRoles:selected.exposedAt,sourcePosition:sourcePosition,
            verdict:verdict,bodyState:bodyStrong?'身強':'身弱',tenGodCounts:roundedCounts,
            successSignals:success,failureSignals:failures,rescueSignals:rescues,
            activeSuccess:activeSuccess,activeFailures:activeFailures,activeRescues:activeRescues,
            unresolvedFailures:unresolvedFailures,summary:summary});
    }

    // 古法外格：僅對四柱可直接核對的結構做保守標籤，不據此改寫喜用神。
    // 「有破格條件」仍保留標籤，方便日後以人生事件驗證，但不宣告格局已成。
    function _detectClassicalOuterPatterns(pillars) {
        const pillarList=[pillars.yearPillar,pillars.monthPillar,pillars.dayPillar,pillars.hourPillar];
        const stems=pillarList.map(x=>x.charAt(0)), branches=pillarList.map(x=>x.charAt(1));
        const dayPillar=pillars.dayPillar, hourPillar=pillars.hourPillar;
        const dayStem=dayPillar.charAt(0), hourStem=hourPillar.charAt(0), hourBranch=hourPillar.charAt(1);
        const out=[];
        function add(id,name,evidence,blockers,status){
            if(out.some(x=>x.id===id))return;
            const bs=(blockers||[]).filter(Boolean);
            out.push({id:id,name:name,status:status||(bs.length?'結構命中、但有破格條件':'結構命中'),
                evidence:evidence||[],blockers:bs,affectsCurve:false,
                note:'古法外格只顯示標籤，暫不影響喜用神與運勢曲線。'});
        }
        function stemCount(st){return stems.filter(x=>x===st).length;}
        function branchCount(br){return branches.filter(x=>x===br).length;}
        function visibleGod(gods){
            const list=Array.isArray(gods)?gods:[gods];
            return [stems[0],stems[1],stems[3]].some(st=>list.indexOf(getTenGod(dayStem,st))!==-1);
        }

        if(new Set(stems).size===1) add('tianyuan_yiqi','天元一氣',[`四柱天干皆為${stems[0]}`]);
        if(new Set(branches).size===1) add('dizhi_yiqi','地支一氣',[`四柱地支皆為${branches[0]}`]);

        const sanQi=[
            {id:'sanqi_heaven',name:'三奇格・天上三奇',seq:['甲','戊','庚']},
            {id:'sanqi_earth',name:'三奇格・地下三奇',seq:['乙','丙','丁']},
            {id:'sanqi_human',name:'三奇格・人中三奇',seq:['壬','癸','辛']}
        ];
        [[0,1,2],[1,2,3]].forEach(win=>sanQi.forEach(q=>{
            const got=win.map(i=>stems[i]);
            if(q.seq.every(st=>got.indexOf(st)!==-1)) add(q.id,q.name,[`相鄰三柱齊見${q.seq.join('')}`],[],
                got.join('')===q.seq.join('')?'順布結構命中':'三干齊見，次序待核');
        }));

        if(['庚辰','庚戌','壬辰','戊戌'].indexOf(dayPillar)!==-1)
            add('kuigang','魁罡格',[`日柱${dayPillar}屬魁罡日`]);
        if(['甲寅','丙辰','戊辰','庚辰','壬戌'].indexOf(dayPillar)!==-1)
            add('ride','日德格',[`日柱${dayPillar}屬日德日`]);
        if(['甲','己'].indexOf(dayStem)!==-1&&['乙丑','己巳','癸酉'].indexOf(hourPillar)!==-1)
            add('jinshen','金神格',[`${dayStem}日見${hourPillar}時`]);

        if(['庚申','庚子','庚辰'].indexOf(dayPillar)!==-1&&['申','子','辰'].every(b=>branches.indexOf(b)!==-1)){
            const blockers=[];
            if(stems.some(s=>s==='丙'||s==='丁'))blockers.push('見丙丁火');
            if(branches.some(b=>['寅','午','戌'].indexOf(b)!==-1))blockers.push('見寅午戌火局或沖申');
            if(stemCount('庚')<2)blockers.push('庚干不重，井欄之勢較弱');
            add('jinglancha','井欄叉格',[`${dayPillar}日，地支申子辰齊全`],blockers);
        }
        if(dayStem==='乙'&&hourPillar==='丙子'){
            const blockers=[];
            if(stems.some(s=>s==='庚'||s==='辛'))blockers.push('見庚辛官殺');
            if(branches.some(b=>['申','酉','午'].indexOf(b)!==-1))blockers.push('見申酉或子午沖');
            add('liuyi_shugui','六乙鼠貴',[`乙日見丙子時`],blockers);
        }
        if(dayStem==='辛'&&hourPillar==='戊子'){
            const blockers=[];
            if(stems.some(s=>s==='丙'||s==='丁'))blockers.push('官殺明透');
            if(branches.some(b=>b==='巳'||b==='午'))blockers.push('見巳午官殺根氣');
            add('liuyin_chaoyang','六陰朝陽',[`辛日見戊子時`],blockers);
        }
        if(dayPillar==='壬辰'&&branchCount('辰')>=2)
            add('renqi_longbei','壬騎龍背',[`壬辰日且辰支${branchCount('辰')}見`],branches.indexOf('戌')!==-1?['辰戌沖動龍背']:[]);
        if(dayStem==='壬'&&hourPillar==='壬寅')
            add('liuren_qugen','六壬趨艮',[`壬日見壬寅時`],branches.indexOf('申')!==-1?['寅申相沖']:[]);
        if(dayStem==='甲'&&hourPillar==='乙亥')
            add('liujia_quqian','六甲趨乾',[`甲日見乙亥時`],branches.indexOf('巳')!==-1?['巳亥相沖']:[]);

        const lu=JIAN_LU_BRANCH[dayStem];
        if(lu&&hourBranch===lu&&pillars.monthPillar.charAt(1)!==lu){
            const blockers=[];
            if(visibleGod(['正官','七殺']))blockers.push('官殺透干，不專依時祿');
            add('rilu_guishi','日祿歸時',[`時支${hourBranch}為${dayStem}日之祿`],blockers);
        }

        // 日時同干、兩支隔一位，中間虛拱日祿或天乙貴人。
        if(dayStem===hourStem){
            const di=EARTHLY_BRANCHES.indexOf(dayPillar.charAt(1)), hi=EARTHLY_BRANCHES.indexOf(hourBranch);
            let middle=null;
            if((di+2)%12===hi)middle=EARTHLY_BRANCHES[(di+1)%12];
            else if((hi+2)%12===di)middle=EARTHLY_BRANCHES[(hi+1)%12];
            if(middle){
                const filled=[pillars.yearPillar.charAt(1),pillars.monthPillar.charAt(1)].indexOf(middle)!==-1;
                if(middle===lu) add('gonglu','拱祿格',[`日時同干${dayStem}，兩支虛拱${middle}祿`],filled?[`拱位${middle}被年月填實`]:[]);
                if((TIAN_YI_BRANCHES[dayStem]||[]).indexOf(middle)!==-1)
                    add('gonggui','拱貴格',[`日時同干${dayStem}，兩支虛拱天乙${middle}`],filled?[`拱位${middle}被年月填實`]:[]);
            }
        }

        const flyRule={
            '庚子':{branch:'子',target:'午'},'壬子':{branch:'子',target:'午'},
            '辛亥':{branch:'亥',target:'巳'},'癸亥':{branch:'亥',target:'巳'}
        }[dayPillar];
        if(flyRule&&branchCount(flyRule.branch)>=2){
            const blockers=[];
            if(branches.indexOf(flyRule.target)!==-1)blockers.push(`所沖${flyRule.target}支填實`);
            if(visibleGod(['正官','七殺']))blockers.push('官殺已明透');
            add('feitian_luma','飛天祿馬',[`${dayPillar}日，${flyRule.branch}支${branchCount(flyRule.branch)}見遠沖${flyRule.target}`],blockers);
        }
        return out;
    }

    // —— 旺衰前置結算：先沖、再依「化神是否透干」結合化（★小六太乙師承，2026-08-09 校正版）——
    //   ① 六沖沿用原規則。② 六合／三合／三會若化神透干，參與支的本氣按透干強度轉給化神：
    //      透 1 干轉 1/2，透 2 干以上全轉；未透仍只增化神 +1，不拔原根。
    //   ③ 無旺神的生墓半合不再完全忽略：化神透干才以「拱局」+0.5，不拔根。
    //   ④ 一支可兼局，但同一強合內按各柱原權重轉氣；刑／破／害仍不進旺衰。
    //   這可處理「月令看似得令，但合化且化神多透，實際根氣已被洩轉」的臨界盤。
    function _settleForStrength(pillars) {
        const roles = [
            { role: '年', branch: pillars.yearPillar.charAt(1), weight: 1 },
            { role: '月', branch: pillars.monthPillar.charAt(1), weight: STRENGTH_CONFIG.monthBranchWeight },
            { role: '日', branch: pillars.dayPillar.charAt(1), weight: 1 },
            { role: '時', branch: pillars.hourPillar.charAt(1), weight: 1 }
        ];
        const set = roles.map(r => r.branch);
        const has = b => set.indexOf(b) !== -1;
        const stemEls = [pillars.yearPillar, pillars.monthPillar, pillars.dayPillar, pillars.hourPillar]
            .map(gz => getElementOf(gz.charAt(0)));
        const revealCount = el => stemEls.filter(e => e === el).length;
        const adj = [];
        const transferredByRole = {}; // 同一地支的本氣最多轉完一次，避免兼局時重複拔根
        const CHONG = { '子':'午','午':'子','卯':'酉','酉':'卯','寅':'申','申':'寅','巳':'亥','亥':'巳','辰':'戌','戌':'辰','丑':'未','未':'丑' };

        function add(type, element, delta, note, extra) {
            if (!delta) return;
            adj.push(Object.assign({ type: type, element: element, delta: delta, note: note }, extra || {}));
        }
        function settleTransform(type, members, el, label, weakArch) {
            const reveal = revealCount(el);
            if (weakArch) {
                if (reveal > 0) add('拱局', el, 0.5, label + '・化神透干，拱' + el + '+0.5', { revealCount: reveal, weak: true });
                return;
            }
            if (!reveal) {
                add(type, el, 1, label + '・化神未透，增' + el + '+1', { revealCount: 0 });
                return;
            }
            const factor = reveal >= 2 ? 1 : 0.5;
            roles.filter(r => members.indexOf(r.branch) !== -1).forEach(r => {
                const available = Math.max(0, 1 - (transferredByRole[r.role] || 0));
                const appliedFactor = Math.min(factor, available);
                const fromEl = getElementOf(r.branch), amount = r.weight * appliedFactor;
                if (!fromEl || fromEl === el || !amount) return;
                transferredByRole[r.role] = (transferredByRole[r.role] || 0) + appliedFactor;
                add('合化根氣', fromEl, -amount,
                    label + '・' + r.role + '支' + r.branch + '根氣轉' + Math.round(appliedFactor * 100) + '%',
                    { revealCount: reveal, factor: appliedFactor, sourceRole: r.role, sourceBranch: r.branch, transformsTo: el });
                add('合化轉氣', el, amount,
                    label + '・' + r.role + '支' + r.branch + '轉化為' + el,
                    { revealCount: reveal, factor: appliedFactor, sourceRole: r.role, sourceBranch: r.branch, transformsTo: el });
            });
        }
        // ① 先沖
        for (let i = 0; i < roles.length; i++) for (let j = i + 1; j < roles.length; j++) {
            const bi = roles[i].branch, bj = roles[j].branch;
            if (CHONG[bi] === bj) {
                let losers;
                if (roles[i].role === '月') losers = [bj];
                else if (roles[j].role === '月') losers = [bi];
                else losers = [bi, bj]; // 皆非月令 → 兩敗（預設）TODO_NAKAI
                losers.forEach(b => add('沖', getElementOf(b), -1, bi + bj + '沖・' + b + '折損'));
            }
        }
        // ② 六合：化神透干才轉根，否則沿用 +1
        const LIUHE = { '子丑':'土','午未':'火','卯戌':'火','辰酉':'金','巳申':'水','寅亥':'木' };
        Object.keys(LIUHE).forEach(k => {
            const members = k.split('');
            if (members.every(has)) settleTransform('合', members, LIUHE[k], k + '六合化' + LIUHE[k], false);
        });
        // ③ 三合：全局／有旺神半合走強合；無旺神生墓半合須化神透干才 +0.5
        const SANHE = [['寅午戌','火','午'],['巳酉丑','金','酉'],['申子辰','水','子'],['亥卯未','木','卯']];
        SANHE.forEach(g => {
            const grp = g[0], el = g[1], wang = g[2];
            const mem = grp.split('').filter(has);
            if (mem.length === 3) settleTransform('三合', mem, el, grp + '三合' + el, false);
            else if (mem.length === 2 && mem.indexOf(wang) !== -1) settleTransform('半合', mem, el, mem.join('') + '半合' + el, false);
            else if (mem.length === 2) settleTransform('拱局', mem, el, mem.join('') + '生墓拱' + el, true);
        });
        const SANHUI = [['寅卯辰','木'],['巳午未','火'],['申酉戌','金'],['亥子丑','水']];
        SANHUI.forEach(g => {
            const members = g[0].split('');
            if (members.every(has)) settleTransform('三會', members, g[1], g[0] + '三會' + g[1], false);
        });
        return adj;
    }

    // —— 旺衰：八分法（統計前先跑 _settleForStrength 結算）——
    function analyzeStrength(pillars) {
        const dayStem = pillars.dayPillar.charAt(0);
        const dayEl = getElementOf(dayStem);
        const slots = [
            { gz: pillars.yearPillar.charAt(0), w: 1 },
            { gz: pillars.yearPillar.charAt(1), w: 1 },
            { gz: pillars.monthPillar.charAt(0), w: 1 },
            { gz: pillars.monthPillar.charAt(1), w: STRENGTH_CONFIG.monthBranchWeight }, // 月令 ×2
            { gz: dayStem, w: 1, isDayMaster: true },
            { gz: pillars.dayPillar.charAt(1), w: 1 },
            { gz: pillars.hourPillar.charAt(0), w: 1 },
            { gz: pillars.hourPillar.charAt(1), w: 1 }
        ];
        let selfScore = 0, foeScore = 0;
        const byElement = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
        const breakdown = [];
        slots.forEach(s => {
            const el = getElementOf(s.gz);
            if (!el) return;
            byElement[el] += s.w;
            const rel = s.isDayMaster ? '同我' : getElementRelation(dayEl, el);
            const isSelf = (rel === '同我' || rel === '生我');
            if (isSelf) selfScore += s.w; else foeScore += s.w;
            breakdown.push({ char: s.gz, element: el, weight: s.w, relation: rel, side: isSelf ? '我' : '敵' });
        });
        const baseScore = { self: selfScore, foe: foeScore, total: selfScore + foeScore };

        // —— 前置結算：先結沖合、再定身強弱 ——
        const settlement = _settleForStrength(pillars);
        settlement.forEach(a => {
            if (byElement[a.element] === undefined) return;
            byElement[a.element] = Math.max(0, byElement[a.element] + a.delta);
            const r = getElementRelation(dayEl, a.element);
            const isSelf = (r === '同我' || r === '生我');
            a.side = isSelf ? '我' : '敵';
            if (isSelf) selfScore = Math.max(0, selfScore + a.delta);
            else foeScore = Math.max(0, foeScore + a.delta);
        });

        const cong = _detectCongGe(pillars, dayEl, selfScore, foeScore, byElement);
        const zhuanWang = _detectZhuanWang(pillars, dayEl, byElement, cong);
        const huaQi = _detectHuaQi(pillars, dayEl, byElement);
        const monthPattern = _detectMonthPattern(pillars);
        const regularMonthPattern = _detectRegularMonthPattern(pillars, selfScore, foeScore, monthPattern);
        const classicalOuterPatterns = _detectClassicalOuterPatterns(pillars);
        let activePattern = null;
        if(huaQi.status==='明確化氣') activePattern={family:'化氣格',pattern:huaQi.pattern};
        else if(zhuanWang.status==='明確專旺') activePattern={family:'專旺格',pattern:zhuanWang.pattern};
        else if(cong.status==='明確從格') activePattern={family:'從格',pattern:cong.pattern||cong.type};
        huaQi.selected=!!activePattern&&activePattern.family==='化氣格';
        zhuanWang.selected=!!activePattern&&activePattern.family==='專旺格';
        cong.selected=!!activePattern&&activePattern.family==='從格';
        let level, summary, confidence;
        if (huaQi.selected) {
            level=huaQi.pattern; summary=huaQi.summary; confidence='特殊格局';
        } else if (zhuanWang.selected) {
            level=zhuanWang.pattern; summary=zhuanWang.summary; confidence='特殊格局';
        } else if (cong.selected) {
            level = cong.type; summary = cong.summary; confidence = '特殊格局';
        } else {
            level = (selfScore > foeScore) ? '身強' : '身弱';
            const gap = Math.abs(selfScore - foeScore);
            confidence = gap <= 1 ? '臨界' : (gap < 2 ? '偏臨界' : '明顯');
            const baseLevel = baseScore.self > baseScore.foe ? '身強' : '身弱';
            const changed = baseLevel !== level;
            summary = '原始八分法：我方 ' + baseScore.self + ' vs 敵方 ' + baseScore.foe + '；合化洩耗校正後：我方 ' + selfScore +
                ' vs 敵方 ' + foeScore + ' → ' + level + '（' + confidence + '）' +
                (changed ? '，判定由' + baseLevel + '轉為' + level : '');
        }
        return {
            level: level,
            score: { self: selfScore, foe: foeScore, total: selfScore + foeScore },
            confidence: confidence,
            details: {
                dayElement: dayEl, byElement: byElement, breakdown: breakdown, baseScore: baseScore, settlement: settlement,
                congGe: cong, zhuanWang:zhuanWang, huaQi:huaQi, monthPattern:monthPattern,
                regularMonthPattern:regularMonthPattern, classicalOuterPatterns:classicalOuterPatterns,
                specialPatternDecision:{priority:['明確化氣','明確專旺','明確從格','正格'],active:activePattern,
                    candidates:[huaQi,zhuanWang,cong].filter(x=>/^疑似/.test(x.status)).map(x=>({type:x.type,pattern:x.pattern,status:x.status}))}
            },
            summary: summary
        };
    }

    // 通關偵測：最旺兩行若相剋且皆夠量，取居中相生之行為通關（木剋土→火；金剋木→水…）。
    function _detectTongGuan(dist, dayEl) {
        const ranked = _ALL_EL.slice().sort((a, b) => dist.counts[b] - dist.counts[a]);
        const a = ranked[0], b = ranked[1];
        if (dist.counts[a] < TONGGUAN_CONFIG.minBothCounts || dist.counts[b] < TONGGUAN_CONFIG.minBothCounts) return null;
        let attacker = null, target = null;
        if (ELEMENT_OVERCOMES[a] === b) { attacker = a; target = b; }
        else if (ELEMENT_OVERCOMES[b] === a) { attacker = b; target = a; }
        else return null;
        if (attacker === dayEl || target === dayEl) return null; // 任一行為日主 → 屬扶抑範疇，非通關
        const bridge = ELEMENT_GENERATES[attacker]; // 攻方所生、且生被剋方者
        if (ELEMENT_GENERATES[bridge] === target) {
            return { element: bridge, note: attacker + '、' + target + ' 兩旺相戰，取通關之「' + bridge + '」化轉。' };
        }
        return null;
    }

    // —— 喜用神選用 ——
    function selectYongShen(pillars, strength, dayMaster) {
        const dayStem = pillars.dayPillar.charAt(0);
        const dayEl = (strength.details && strength.details.dayElement) || getElementOf(dayStem);
        const rawDist = analyzeElementDistribution(pillars);
        const adjustedCounts = Object.assign({}, rawDist.counts);
        ((strength.details && strength.details.settlement) || []).forEach(a => {
            if (adjustedCounts[a.element] !== undefined) adjustedCounts[a.element] = Math.max(0, adjustedCounts[a.element] + a.delta);
        });
        const dist = { counts: adjustedCounts }; // 保留藏干權重，再套入沖合洩化校正

        function pack(method, fav, unfav, note) {
            const favorable = _uniq(fav);
            const unfavorable = _uniq(unfav).filter(e => favorable.indexOf(e) === -1);
            const neutral = _ALL_EL.filter(e => favorable.indexOf(e) === -1 && unfavorable.indexOf(e) === -1);
            return {
                method: method, favorable: favorable, unfavorable: unfavorable, neutral: neutral,
                tags: favorable.map(e => 'yong:' + e).concat(unfavorable.map(e => 'ji:' + e)),
                summary: note
            };
        }

        const cong = (strength.details && strength.details.congGe) || { status:'正格', type:null, pattern:null };
        const zhuanWang = (strength.details && strength.details.zhuanWang) || { status:'正格', type:'專旺', pattern:null };
        const huaQi = (strength.details && strength.details.huaQi) || { status:'正格', type:'化氣', pattern:null };
        const monthPattern = (strength.details && strength.details.monthPattern) || { status:'未成立', type:null };
        const regularMonthPattern = (strength.details && strength.details.regularMonthPattern) || { status:'取格條件不足', pattern:null, verdict:null };
        const classicalOuterPatterns = (strength.details && strength.details.classicalOuterPatterns) || [];
        const specialDecision = (strength.details && strength.details.specialPatternDecision) || { active:null };
        function followWeakPack(isAlternative) {
            const enemy = _ALL_EL.filter(e => {
                const r=getElementRelation(dayEl,e);
                return r==='我生'||r==='我剋'||r==='剋我';
            }).sort((a,b) => (dist.counts[b]||0)-(dist.counts[a]||0));
            const dominant = cong.dominantElement || enemy[0];
            const rel = dominant ? getElementRelation(dayEl,dominant) : null;
            let fav;
            if(cong.pattern==='從勢格') fav=enemy.filter(e => (dist.counts[e]||0)>0);
            else {
                const partner = rel==='我生' ? ELEMENT_GENERATES[dominant] : _generatorOf(dominant);
                fav=_uniq([dominant,partner]).filter(e => enemy.indexOf(e)!==-1);
            }
            if(!fav.length) fav=enemy.slice(0,2);
            const pattern=cong.pattern||'從弱格';
            const r=pack((isAlternative?'疑似':'')+pattern+'順勢'+(isAlternative?'（備選）':''),fav,
                _uniq([dayEl,_generatorOf(dayEl)]),
                (isAlternative?'疑似':'明確')+pattern+'：順敵方主勢取「'+fav.join('、')+'」，忌印比「'+_uniq([dayEl,_generatorOf(dayEl)]).join('、')+'」回頭生身。'+
                (isAlternative?' 此組只供人生應證比較，目前不參與大運與流年曲線計分。':''));
            r.decision={activeRule:isAlternative?'從格備選':'明確從格',congStatus:cong.status,affectsCurve:!isAlternative};
            return r;
        }
        function zhuanWangPack(isAlternative, variant) {
            const zw=variant||zhuanWang;
            if(zw.subtype==='專旺我'){
                // 專旺我：沿用原從強喜忌口徑（印比喜；食傷、財、官殺忌），財與食傷可否容許 TODO_NAKAI
                const fav=_uniq([dayEl,_generatorOf(dayEl)]);
                const unfav=_ALL_EL.filter(e => fav.indexOf(e)===-1);
                const r=pack((isAlternative?'疑似':'')+'專旺我順勢'+(isAlternative?'（備選）':''),fav,unfav,
                    (isAlternative?'疑似':'明確')+'專旺我：印生我、屬我方，順印比「'+fav.join('、')+'」；逆勢的食傷、財與官殺列忌。'+
                    (isAlternative?' 此組只供人生應證比較，目前不參與大運與流年曲線計分。':''));
                r.decision={activeRule:isAlternative?'專旺備選':'明確專旺',pattern:'專旺我',subtype:'專旺我',affectsCurve:!isAlternative};
                return r;
            }
            const el=zw.element||dayEl;
            const fav=_uniq([el,_generatorOf(el),ELEMENT_GENERATES[el]]);
            const unfav=_uniq([_overcomerOf(el)]);
            const r=pack((isAlternative?'疑似':'')+(zw.pattern||ZHUAN_WANG_NAMES[el])+'順勢'+(isAlternative?'（備選）':''),fav,unfav,
                (isAlternative?'疑似':'明確')+(zw.pattern||ZHUAN_WANG_NAMES[el])+'：喜本行、印生與食傷洩秀，忌官殺「'+unfav.join('、')+'」逆制。'+
                (isAlternative?' 此組只供人生應證比較，目前不參與大運與流年曲線計分。':''));
            r.decision={activeRule:isAlternative?'專旺備選':'明確專旺',pattern:zw.pattern,subtype:'一行型',affectsCurve:!isAlternative};
            return r;
        }
        function huaQiPack(isAlternative) {
            const el=huaQi.element;
            const fav=_uniq([el,_generatorOf(el),ELEMENT_GENERATES[el]]);
            const unfav=_uniq([_overcomerOf(el)]);
            const r=pack((isAlternative?'疑似':'')+huaQi.pattern+'順化'+(isAlternative?'（備選）':''),fav,unfav,
                (isAlternative?'疑似':'明確')+huaQi.pattern+'：以化神「'+el+'」為中心，喜生助化神與順勢洩秀，忌「'+unfav.join('、')+'」破化。'+
                (isAlternative?' 此組只供人生應證比較，目前不參與大運與流年曲線計分。':''));
            r.decision={activeRule:isAlternative?'化氣備選':'明確化氣',pattern:huaQi.pattern,affectsCurve:!isAlternative};
            return r;
        }
        function finalizeSpecialDecision(main,activeRule) {
            const alternatives=[];
            if(huaQi.status==='疑似化氣') alternatives.push(huaQiPack(true));
            (zhuanWang.variants||[zhuanWang]).forEach(v=>{ if(v.status==='疑似專旺') alternatives.push(zhuanWangPack(true,v)); });
            if(cong.status==='疑似從格') alternatives.push(followWeakPack(true));
            main.decision={activeRule:activeRule||'正格',affectsCurve:true,congStatus:cong.status||'正格',
                zhuanWangStatus:zhuanWang.status||'正格',zhuanWangSubtype:zhuanWang.subtype||null,huaQiStatus:huaQi.status||'正格',monthPattern:monthPattern.type||null,
                regularMonthPattern:regularMonthPattern.pattern||null,regularMonthVerdict:regularMonthPattern.verdict||null,
                classicalOuterPatterns:classicalOuterPatterns.map(x=>x.name),interpretivePatternsAffectCurve:false};
            if(alternatives.length){
                main.alternatives=alternatives;
                main.alternative=alternatives[0]; // 向後相容：第一順位備選
                main.decision.note='疑似特殊格局不直接翻轉喜忌；目前曲線採已選定主規則，備選喜忌完整保存供人生應證。';
            }
            return main;
        }

        // ── 第 0 層：特殊格局優先裁定（明確化氣 → 明確專旺 → 明確從格）──
        if(specialDecision.active&&specialDecision.active.family==='化氣格') return finalizeSpecialDecision(huaQiPack(false),'明確化氣格');
        if(specialDecision.active&&specialDecision.active.family==='專旺格') return finalizeSpecialDecision(zhuanWangPack(false),'明確專旺格');
        if(specialDecision.active&&specialDecision.active.family==='從格'&&strength.level==='從弱') return finalizeSpecialDecision(followWeakPack(false),'明確從格');

        // ── 第 1 層：調候閘門（閘一：冬夏月　閘二：藏干計入、沖合作廢後仍缺）──
        const mb = pillars.monthPillar.charAt(1);
        const isWinter = TIAOHOU_CONFIG.winter.indexOf(mb) !== -1;
        const isSummer = TIAOHOU_CONFIG.summer.indexOf(mb) !== -1;
        if (isWinter || isSummer) {
            const valid = _collectValidElements(pillars);
            const need = isWinter ? TIAOHOU_CONFIG.winterNeeds : TIAOHOU_CONFIG.summerNeeds;
            if (need.every(e => !valid.has(e))) {
                return finalizeSpecialDecision(pack('調候拍板', need.slice(), isWinter ? ['水'] : ['火'],
                    (isWinter ? '冬月天寒地凍、全盤無木火' : '夏月火炎土燥、全盤無金水') + '，調候奪權，以「' + need.join('、') + '」為用。'));
            }
        }

        // ── 第 2 層病藥 ＋ 第 3 層扶抑（併參）──
        const bing = _ALL_EL.slice().sort((a, b) => dist.counts[b] - dist.counts[a])[0]; // 最旺一行＝病
        const yaoKe = _overcomerOf(bing);          // 剋病之藥
        const yaoXie = ELEMENT_GENERATES[bing];     // 洩病之藥
        let method, fav, unfav, note;
        if (strength.level === '身強') {
            // 先由扶抑定喜忌邊界，再讓病藥排序；病藥若選到印比，不得覆蓋「身強忌再扶」原則。
            const fuYiFav = _ALL_EL.filter(e => {
                const r = getElementRelation(dayEl, e);
                return r === '剋我' || r === '我生' || r === '我剋';
            });
            const fuYiUnfav = _ALL_EL.filter(e => {
                const r = getElementRelation(dayEl, e);
                return r === '同我' || r === '生我';
            });
            const medicine = _uniq([yaoKe, yaoXie]).filter(e => fuYiFav.indexOf(e) !== -1);
            const rejected = _uniq([yaoKe, yaoXie]).filter(e => fuYiUnfav.indexOf(e) !== -1);
            fav = medicine.length ? medicine : fuYiFav;
            unfav = fuYiUnfav;
            method = '扶抑定界＋病藥排序（身強抑）';
            note = '合化後最旺一行「' + bing + '」為病；先依身強扶抑排除印比（' + unfav.join('、') + '），再於剋洩耗範圍選病藥（' + fav.join('、') + '）為喜。' +
                (rejected.length ? ' 病藥候選「' + rejected.join('、') + '」與身強扶抑衝突，已排除，不讓喜忌重疊。' : '');
        } else {
            fav = _uniq([dayEl, _generatorOf(dayEl)]); // 身弱：印比扶身
            unfav = _ALL_EL.filter(e => { const r = getElementRelation(dayEl, e); return r === '剋我' || r === '我生' || r === '我剋'; });
            method = (strength.details && strength.details.baseScore && strength.details.baseScore.self > strength.details.baseScore.foe)
                ? '合化洩氣校正＋身弱扶' : '身弱扶';
            note = '合化洩耗校正後日主身弱，喜印比生扶（' + fav.join('、') + '）；忌官殺剋身、食傷洩身、財耗身生殺（' + unfav.join('、') + '）。';
        }

        // ── 第 4 層通關 ──
        const guan = _detectTongGuan(dist, dayEl);
        if (guan && fav.indexOf(guan.element) === -1 && unfav.indexOf(guan.element) === -1) {
            fav = _uniq(fav.concat([guan.element])); note += ' 另：' + guan.note; method += '＋通關';
        }

        return finalizeSpecialDecision(pack(method, fav, unfav, note));
    }


    // ============================================================
    // 六、整合：一次產出完整八字盤資料
    // ============================================================

    /**
     * 通用：分析任一「時間柱」（流年/流月/流日）對本命日柱的互動
     * @param {string} dayPillar 本命日柱
     * @param {string} timePillar 流年/流月/流日柱
     * @param {string} layerLabel 層級標籤（'流年'/'流月'/'流日'）
     */
    function analyzeTimePillar(dayPillar, timePillar, layerLabel) {
        return {
            layer: layerLabel || '',
            pillar: timePillar,
            elementInteraction: analyzeElementInteraction(dayPillar, timePillar),
            tenGods: analyzeTenGodsInteraction(dayPillar, timePillar)
        };
    }

    /**
     * 一次取得某個日期的「流年 + 流月 + 流日」三柱及其分析
     * @param {string} dayPillar 本命日柱
     * @param {number} year 國曆年
     * @param {number} month 國曆月
     * @param {number} day 國曆日
     */
    function analyzeDateLayers(dayPillar, year, month, day) {
        const annualPillar = getAnnualPillar(year);
        const monthlyPillar = getMonthlyPillar(year, month, day);
        const dailyPillar = getDailyPillar(year, month, day);
        return {
            date: { year, month, day },
            annual: analyzeTimePillar(dayPillar, annualPillar, '流年'),
            monthly: analyzeTimePillar(dayPillar, monthlyPillar, '流月'),
            daily: analyzeTimePillar(dayPillar, dailyPillar, '流日')
        };
    }

    // ============================================================
    // 六-bis、動態層深度整合（INTEGRATION 第 3 節）
    //   資料流：原局 → 旺衰 → 喜用神 → 各流年/大運/流月+原局四支
    //           → BaziRelations.detectGroupRelations + BaziClashTable.lookupClash
    //           → 逐項判喜忌（命理線）→ BaziWuxingHealth.yangshengAdvice（養生線）
    //
    //   ★ 接線而非重寫：合會刑沖破害的「描述」「養生」全來自 5 個資料表，引擎只做
    //     「偵測 → 對照喜用神判吉凶 → 串接」。沖喜神為凶/沖忌神為吉等判讀為通則，
    //     涉及流派處標 TODO_NAKAI。
    // ============================================================

    // 五個資料表的取得：優先用注入，其次全域，其次 Node require；缺席則回 null（降級不報錯）
    var _injectedTables = {};
    function setTables(t) {
        if (!t) return;
        ['relations', 'clash', 'palace', 'health'].forEach(k => { if (t[k]) _injectedTables[k] = t[k]; });
    }
    function _globalScope() {
        return (typeof globalThis !== 'undefined') ? globalThis
            : (typeof window !== 'undefined') ? window
            : (typeof self !== 'undefined') ? self : null;
    }
    function _table(key, globalName, nodeFile) {
        if (_injectedTables[key]) return _injectedTables[key];
        const g = _globalScope();
        if (g && g[globalName]) { _injectedTables[key] = g[globalName]; return g[globalName]; }
        if (typeof require === 'function' && nodeFile) {
            try { const m = require(nodeFile); if (m) { _injectedTables[key] = m; return m; } } catch (e) { /* 缺席降級 */ }
        }
        return null;
    }
    const _relTable = () => _table('relations', 'BaziRelations', './bazi-relations-table.js');
    const _clashTable = () => _table('clash', 'BaziClashTable', './bazi-clash-table.js');
    const _healthTable = () => _table('health', 'BaziWuxingHealth', './bazi-wuxing-health-table.js');

    // 流月地支 → 當令五行（辰未戌丑歸長夏=土）
    const _SEASON_ELEMENT_BY_BRANCH = {
        '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土',
        '申': '金', '酉': '金', '戌': '土', '亥': '水', '子': '水', '丑': '土'
    };

    // 某五行落在喜/忌/閒
    function _yongHit(yongShen, el) {
        if (!yongShen || !el) return '閒';
        if (yongShen.favorable && yongShen.favorable.indexOf(el) !== -1) return '喜';
        if (yongShen.unfavorable && yongShen.unfavorable.indexOf(el) !== -1) return '忌';
        return '閒';
    }
    // 合化/三合/三會：引動的五行落喜→吉、落忌→凶、閒→中（transformsTo 可能是 "火/土"）
    function _verdictByTransform(yongShen, transformsTo) {
        const els = String(transformsTo || '').split('/').filter(Boolean);
        let hasFav = false, hasUnfav = false;
        els.forEach(e => { const h = _yongHit(yongShen, e); if (h === '喜') hasFav = true; else if (h === '忌') hasUnfav = true; });
        if (hasFav && !hasUnfav) return '吉';
        if (hasUnfav && !hasFav) return '凶';
        if (hasFav && hasUnfav) return '吉凶參半';
        return '中';
    }
    // 沖/破/害/刑：剋洩去「忌神所坐之支」偏吉、動搖「喜神所坐之支」偏凶（TODO_NAKAI：流派可調）
    function _verdictByAfflict(yongShen, affectedElement) {
        const h = _yongHit(yongShen, affectedElement);
        if (h === '喜') return '凶';
        if (h === '忌') return '吉';
        return '中';
    }

    /**
     * 單一動態柱（大運/流年/流月/流日）對原局的深度引動分析
     * @param {string} dayStem 日主天干
     * @param {Array}  origPos [{role:'年'|'月'|'日'|'時', branch}]
     * @param {string} timePillar 動態柱干支
     * @param {string} layerLabel '大運'|'流年'|'流月'|'流日'
     * @param {Object} yongShen selectYongShen 結果
     */
    function analyzeActivation(dayStem, origPos, timePillar, layerLabel, yongShen) {
        if (!timePillar) return { layer: layerLabel, pillar: null, note: '無資料（如未起運）' };
        const tStem = timePillar.charAt(0);
        const tBranch = timePillar.charAt(1);
        const origBranches = origPos.map(o => o.branch);
        const allBranches = origBranches.concat([tBranch]);
        const REL = _relTable();
        const CLASH = _clashTable();

        const relations = [];
        const clashes = [];
        let jiCount = 0, xiongCount = 0;
        const favEls = [], unfavEls = [];

        // —— 天干：對日主的十神 ＋ 與日主五合/相剋 ——
        const stemTenGod = getTenGod(dayStem, tStem);
        const stemRule = STEM_INTERACTIONS[dayStem] || {};
        let stemRel = null;
        if (stemRule.combinesWith === tStem) stemRel = `與日主 ${dayStem}${tStem} 相合`;
        else if (stemRule.clashesWith === tStem) stemRel = `剋日主（${tStem}剋${dayStem}）`;

        // —— 地支群關係（與原局四支一起判，只取「引動到此動態支」者）——
        if (REL) {
            const grp = REL.detectGroupRelations(allBranches);
            const involves = arr => arr && arr.indexOf(tBranch) !== -1;

            (grp.sanhui || []).forEach(s => {
                if (!involves(s.involved)) return;
                const v = _verdictByTransform(yongShen, s.transformsTo);
                relations.push({ kind: '三會', name: s.name, involved: s.involved, complete: s.complete, transformsTo: s.transformsTo, verdict: v, reason: `${s.involved.join('')}${s.complete ? '三會' : '半會'}化${s.transformsTo}（${_yongHit(yongShen, s.transformsTo)}神）` });
                if (v === '吉') { jiCount++; favEls.push(s.transformsTo); } else if (v === '凶') { xiongCount++; unfavEls.push(s.transformsTo); }
            });
            (grp.sanhe || []).forEach(s => {
                if (!involves(s.involved)) return;
                const v = _verdictByTransform(yongShen, s.transformsTo);
                relations.push({ kind: '三合', name: s.name, involved: s.involved, complete: s.complete, grade: s.grade, transformsTo: s.transformsTo, verdict: v, reason: `${s.involved.join('')}${s.grade}化${s.transformsTo}（${_yongHit(yongShen, s.transformsTo)}神）` });
                if (v === '吉') { jiCount++; favEls.push(s.transformsTo); } else if (v === '凶') { xiongCount++; unfavEls.push(s.transformsTo); }
            });
            (grp.xing || []).forEach(x => {
                if (!involves(x.involved)) return;
                // 刑為「痛苦的修正」，吉凶依流派，這裡標中性並帶養生提醒
                relations.push({ kind: '刑', name: x.type, involved: x.involved, complete: x.complete, verdict: '中', reason: `${x.involved.join('')}${x.type}${x.complete ? '' : '（半刑）'}`, gentleReminder: x.info && x.info.gentleReminder });
            });

            // —— 成對關係（六合/破/害/暗合）：以「流曜支 × 每個原局支」逐一查表（lookupPair）。
            //    不用 grp.pairs 過濾——同字支時（流曜支與某原局支同字）字元比對會把
            //    原局內部的關係誤歸給流曜、且同一關係重複計數（M1 修正）。
            //    刑不在此處理：交由上方群體偵測（含三刑/半刑/自刑），避免重複。——
            origPos.forEach(o => {
                const lp = REL.lookupPair(tBranch, o.branch);
                if (!lp) return;
                if (lp.liuhe) {
                    const v = _verdictByTransform(yongShen, lp.liuhe.transformsTo);
                    relations.push({ kind: '六合', pair: lp.pair, with: o.role + '支', transformsTo: lp.liuhe.transformsTo, verdict: v, reason: `與${o.role}支${o.branch}六合化${lp.liuhe.transformsTo}（${_yongHit(yongShen, lp.liuhe.transformsTo)}神）`, gentleReminder: lp.liuhe.gentleReminder });
                    if (v === '吉') { jiCount++; favEls.push(lp.liuhe.transformsTo); } else if (v === '凶') { xiongCount++; unfavEls.push(lp.liuhe.transformsTo); }
                }
                if (lp.po) {
                    const affEl = getElementOf(o.branch);
                    const v = _verdictByAfflict(yongShen, affEl);
                    relations.push({ kind: '破', pair: lp.po.pair, with: o.role + '支', affected: o.branch, affectedElement: affEl, verdict: v, reason: `破動${o.role}支${o.branch}(${affEl}·${_yongHit(yongShen, affEl)}神)`, gentleReminder: lp.po.gentleReminder });
                    if (v === '吉') jiCount++; else if (v === '凶') xiongCount++;
                }
                if (lp.hai) {
                    const affEl = getElementOf(o.branch);
                    const v = _verdictByAfflict(yongShen, affEl);
                    relations.push({ kind: '害', pair: lp.hai.pair, with: o.role + '支', affected: o.branch, affectedElement: affEl, verdict: v, reason: `害動${o.role}支${o.branch}(${affEl}·${_yongHit(yongShen, affEl)}神)`, gentleReminder: lp.hai.gentleReminder });
                    if (v === '吉') jiCount++; else if (v === '凶') xiongCount++;
                }
                if (lp.anhe) {
                    relations.push({ kind: '暗合', pair: lp.anhe.pair, with: o.role + '支', verdict: '中', reason: `與${o.role}支${o.branch}暗合（${lp.anhe.links.join('、')}）`, gentleReminder: lp.anhe.gentleReminder });
                }
            });
        }

        // —— 六沖（用 clash 表描述）——
        if (CLASH) {
            origPos.forEach(o => {
                const c = CLASH.lookupClash(o.branch, tBranch);
                if (!c) return;
                const affEl = getElementOf(o.branch);
                const v = _verdictByAfflict(yongShen, affEl);
                clashes.push({ with: o.role + '支' + o.branch, categoryLabel: c.categoryLabel, subtype: c.subtype, affectedElement: affEl, hit: _yongHit(yongShen, affEl), verdict: v, gentleReminder: c.gentleReminder });
                if (v === '吉') jiCount++; else if (v === '凶') xiongCount++;
            });
        }

        const net = (jiCount > xiongCount) ? '偏吉' : (xiongCount > jiCount) ? '偏凶' : '中性';
        const pending = [];
        if (!REL) pending.push('關係合會刑破害（待 bazi-relations-table）');
        if (!CLASH) pending.push('六沖描述（待 bazi-clash-table）');
        return {
            layer: layerLabel, pillar: timePillar, stem: tStem, branch: tBranch,
            stemTenGod: stemTenGod, stemRelation: stemRel,
            relations: relations,
            clashes: CLASH ? clashes : null,            // null = 待資料表（非「無沖」）
            verdict: { ji: jiCount, xiong: xiongCount, net: net, favorableElements: _uniq(favEls), unfavorableElements: _uniq(unfavEls) },
            pending: pending,
            modulesMissing: { relations: !REL, clash: !CLASH }
        };
    }

    /**
     * 動態層總成：以查詢日期取大運/流年/流月/流日，逐柱深度引動分析 ＋ 養生方向
     * @param {Object} chart computeChart 的回傳（需含 pillars / strength / yongShen / meta）
     * @param {number} qY 查詢年（流年/大運基準）
     * @param {number} qM 查詢月（流月基準）
     * @param {number} qD 查詢日（流日基準）
     */
    // —— 跨柱關係偵測：給一組「柱→地支」找刑／沖／破／害／六合／三合／三會（本氣，不含藏干暗合）——
    //   用於：A 大運+流年 牽動本命；B 大運+流年+流月+流日 四柱彼此（本期時運）。
    function _crossRelations(tagged, REL, CLASH) {
        const out = [];
        if (!REL || !tagged.length) return out;
        const brs = tagged.map(t => t.br);
        const roleOf = {};
        tagged.forEach(t => { roleOf[t.br] = roleOf[t.br] || []; if (roleOf[t.br].indexOf(t.role) === -1) roleOf[t.br].push(t.role); });
        const pillarsOf = inv => inv.map(b => (roleOf[b] || ['?']).join('/'));
        const gr = REL.detectGroupRelations(brs);
        (gr.xing || []).forEach(x => out.push({ kind: '刑', type: x.type, involved: x.involved, pillars: pillarsOf(x.involved), complete: x.complete, gentleReminder: x.info && x.info.gentleReminder }));
        (gr.sanhe || []).forEach(s => out.push({ kind: '三合', name: s.name, involved: s.involved, pillars: pillarsOf(s.involved), grade: s.grade, complete: s.complete, transformsTo: s.transformsTo }));
        (gr.sanhui || []).forEach(s => out.push({ kind: '三會', name: s.name, involved: s.involved, pillars: pillarsOf(s.involved), complete: s.complete, transformsTo: s.transformsTo }));
        for (let i = 0; i < tagged.length; i++) for (let j = i + 1; j < tagged.length; j++) {
            const a = tagged[i], b = tagged[j];
            if (a.br === b.br) continue;
            if (CLASH) { const c = CLASH.lookupClash(a.br, b.br); if (c) out.push({ kind: '沖', involved: [a.br, b.br], pillars: [a.role, b.role], categoryLabel: c.categoryLabel, subtype: c.subtype, gentleReminder: c.gentleReminder }); }
            const lp = REL.lookupPair(a.br, b.br);
            if (lp && lp.liuhe) out.push({ kind: '六合', involved: [a.br, b.br], pillars: [a.role, b.role], transformsTo: lp.liuhe.transformsTo, gentleReminder: lp.liuhe.gentleReminder });
            if (lp && lp.po) out.push({ kind: '破', involved: [a.br, b.br], pillars: [a.role, b.role], gentleReminder: lp.po.gentleReminder });
            if (lp && lp.hai) out.push({ kind: '害', involved: [a.br, b.br], pillars: [a.role, b.role], gentleReminder: lp.hai.gentleReminder });
        }
        return out;
    }

    function analyzeDynamics(chart, qY, qM, qD) {
        const p = chart.pillars;
        const dayStem = p.dayPillar.charAt(0);
        const yongShen = chart.yongShen || selectYongShen(p, chart.strength, chart.dayMaster);
        const strength = chart.strength || analyzeStrength(p);
        const origPos = [
            { role: '年', branch: p.yearPillar.charAt(1) },
            { role: '月', branch: p.monthPillar.charAt(1) },
            { role: '日', branch: p.dayPillar.charAt(1) },
            { role: '時', branch: p.hourPillar.charAt(1) }
        ];

        // 動態四曜（與細盤同一套計算）
        const annualGZ = getAnnualPillar(qY);
        const monthlyGZ = getMonthlyPillar(qY, qM, qD);
        const dailyGZ = getDailyPillar(qY, qM, qD);
        const cycle = getLuckCycle(chart.meta.solarBirth, (chart.meta && chart.meta.gender) || '男', p.yearPillar.charAt(0), p.monthPillar);
        const curLuck = cycle.dataMissing ? null : getCurrentLuckPillar(cycle, chart.meta.solarBirth, qY, qM, qD);
        const daYunGZ = curLuck ? curLuck.pillar : null;

        const layers = {
            daYun: analyzeActivation(dayStem, origPos, daYunGZ, '大運', yongShen),
            annual: analyzeActivation(dayStem, origPos, annualGZ, '流年', yongShen),
            monthly: analyzeActivation(dayStem, origPos, monthlyGZ, '流月', yongShen),
            daily: analyzeActivation(dayStem, origPos, dailyGZ, '流日', yongShen)
        };

        // —— 跨柱偵測（★小六太乙師承 2026-08-08 定）——
        //   A 大運+流年 牽動本命：只列「需大運且流年一起（可含本命）」才成的關係（單一流曜×本命已在各層判過）。
        //   B 本期時運：大運+流年+流月+流日 四柱彼此的刑沖破害合會，反映今日/本月行事順暢與否。
        const REL2 = _relTable(), CLASH2 = _clashTable();
        const dyBr = daYunGZ ? daYunGZ.charAt(1) : null;
        const anBr = annualGZ ? annualGZ.charAt(1) : null;
        const moBr = monthlyGZ ? monthlyGZ.charAt(1) : null;
        const dwBr = dailyGZ ? dailyGZ.charAt(1) : null;
        // A：{本命四支 + 大運 + 流年}，留下「同時牽動到大運與流年」的（避免與各層重複）
        const natalTag = origPos.map(o => ({ role: o.role + '(本命)', br: o.branch }));
        const aTag = natalTag.concat(dyBr ? [{ role: '大運', br: dyBr }] : [], anBr ? [{ role: '流年', br: anBr }] : []);
        const hasRole = (ps, kw) => ps.some(p => p.indexOf(kw) !== -1);
        const crossNatal = _crossRelations(aTag, REL2, CLASH2).filter(r => hasRole(r.pillars, '本命') && hasRole(r.pillars, '大運') && hasRole(r.pillars, '流年'));
        // B：{大運 流年 流月 流日} 彼此
        // B 本月時運：大運+流年+流月 彼此；本日時運：加入流日後「因流日而新增」的引動。
        const monthTag = [];
        if (dyBr) monthTag.push({ role: '大運', br: dyBr });
        if (anBr) monthTag.push({ role: '流年', br: anBr });
        if (moBr) monthTag.push({ role: '流月', br: moBr });
        const monthFlow = _crossRelations(monthTag, REL2, CLASH2);
        const dayTag = monthTag.concat(dwBr ? [{ role: '流日', br: dwBr }] : []);
        const dayFlow = _crossRelations(dayTag, REL2, CLASH2).filter(r => r.pillars.some(p => p.indexOf('流日') !== -1));

        // 養生線：旺衰 byElement ＋ 當下流月當令五行
        const HEALTH = _healthTable();
        const seasonElement = _SEASON_ELEMENT_BY_BRANCH[monthlyGZ.charAt(1)] || null;
        const yangsheng = (HEALTH && strength.details && strength.details.byElement)
            ? { seasonElement: seasonElement, advice: HEALTH.yangshengAdvice(strength.details.byElement, seasonElement) }
            : { seasonElement: seasonElement, advice: null, pending: true, note: '待資料表（養生表 bazi-wuxing-health-table）' };

        return {
            query: { year: qY, month: qM, day: qD },
            yongShen: { favorable: yongShen.favorable, unfavorable: yongShen.unfavorable, neutral: yongShen.neutral, method: yongShen.method },
            layers: layers,
            crossPillar: { natal: crossNatal, month: monthFlow, day: dayFlow },
            yangsheng: yangsheng
        };
    }

    /**
     * 主入口：從生日資料產出完整八字分析
     * @param {Object} input { name, gender, year, month, day, hour, targetYear?, targetDate? }
     * @returns {Object} 完整八字資料（可直接 JSON 匯出給 Skill 用）
     */
    function computeChart(input) {
        const { name, gender, year, month, day, hour, targetYear, targetDate } = input;

        const pillars = calculateFourPillars(year, month, day, hour);
        const dayMaster = getDayMasterInfo(pillars.dayPillar);
        const fullTenGods = analyzeFullTenGods(pillars);
        const elementDist = analyzeElementDistribution(pillars);
        const kongWang = calculateKongWang(pillars.dayPillar);
        const strength = analyzeStrength(pillars);
        const yongShen = selectYongShen(pillars, strength, dayMaster);

        const result = {
            meta: {
                name: name || '未命名',
                gender: gender || '未指定',
                solarBirth: { year, month, day, hour },
                generatedAt: new Date().toISOString()
            },
            pillars: pillars,
            dayMaster: dayMaster,
            fullTenGods: fullTenGods,
            elementDistribution: elementDist,
            kongWang: kongWang,
            strength: strength,
            yongShen: yongShen
        };

        // 如果指定了流年，加上流年分析
        if (targetYear) {
            result.annual = analyzeTimePillar(pillars.dayPillar, getAnnualPillar(targetYear), '流年');
            result.annual.targetYear = targetYear;
        }

        // 如果指定了完整日期，加上流年+流月+流日三層分析（淺層，向後相容）
        // 以及動態層深度引動分析（深層：合會刑沖破害 × 喜用神 × 養生）
        if (targetDate && targetDate.year && targetDate.month && targetDate.day) {
            result.dateLayers = analyzeDateLayers(
                pillars.dayPillar, targetDate.year, targetDate.month, targetDate.day
            );
            result.dynamics = analyzeDynamics(result, targetDate.year, targetDate.month, targetDate.day);
        }

        return result;
    }

    // ============================================================
    // 七、細盤（截圖式表格）所需的新計算
    //     —— 十二長生、納音、神煞、大運
    //     以下皆為本次新增；計算規則若涉及流派差異，已於註解標明。
    // ============================================================

    const YANG_STEMS = ['甲', '丙', '戊', '庚', '壬'];
    function isYangStem(stem) { return YANG_STEMS.indexOf(stem) !== -1; }

    // ---- 十二長生 ----
    // 順序固定；陽干順行、陰干逆行。各天干「長生」起點（土寄火）：
    const TWELVE_STAGES = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
    const CHANG_SHENG_START = {
        '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
        '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯'
    };

    /**
     * 取某天干在某地支的十二長生階段
     * 用於「星運」（柱支對日主天干）與「自坐」（柱干坐柱支）
     */
    function getTwelveStage(stem, branch) {
        const start = CHANG_SHENG_START[stem];
        if (!start) return '';
        const startIdx = EARTHLY_BRANCHES.indexOf(start);
        const bIdx = EARTHLY_BRANCHES.indexOf(branch);
        if (startIdx < 0 || bIdx < 0) return '';
        const pos = isYangStem(stem)
            ? (bIdx - startIdx + 12) % 12   // 陽順
            : (startIdx - bIdx + 12) % 12;  // 陰逆
        return TWELVE_STAGES[pos];
    }

    // 由十二長生反查某天干的特定階段所在地支（用於祿神=臨官、羊刃=帝旺）
    function branchOfStage(stem, stageName) {
        for (let i = 0; i < EARTHLY_BRANCHES.length; i++) {
            if (getTwelveStage(stem, EARTHLY_BRANCHES[i]) === stageName) return EARTHLY_BRANCHES[i];
        }
        return null;
    }

    // ---- 六十甲子序號 / 納音 ----
    // 由干支求其在六十甲子中的序號（0-59）
    function ganZhiIndex(ganZhi) {
        const si = HEAVENLY_STEMS.indexOf(ganZhi.charAt(0));
        const bi = EARTHLY_BRANCHES.indexOf(ganZhi.charAt(1));
        if (si < 0 || bi < 0) return -1;
        for (let i = 0; i < 60; i++) {
            if (i % 10 === si && i % 12 === bi) return i;
        }
        return -1;
    }
    function ganZhiFromIndex(idx) {
        idx = ((idx % 60) + 60) % 60;
        return HEAVENLY_STEMS[idx % 10] + EARTHLY_BRANCHES[idx % 12];
    }

    // 六十甲子納音（每 2 柱共用一個納音，共 30 個）
    const NAYIN_30 = [
        '海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木',
        '泉中水', '屋上土', '霹靂火', '松柏木', '長流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
        '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'
    ];
    function getNaYin(ganZhi) {
        const idx = ganZhiIndex(ganZhi);
        if (idx < 0) return '';
        return NAYIN_30[Math.floor(idx / 2)] || '';
    }

    // ---- 神煞 ----
    // 【流派說明】神煞取法各家不同。本工具採常見「今法」：
    //   ‧ 干系神煞（天乙、文昌、祿神、羊刃、飛刃）以「日干」為主。
    //   ‧ 三合系神煞（驛馬、桃花、華蓋、將星、劫煞、災煞、亡神）以「日支」起三合局。
    //   ‧ 紅鸞、天喜以「年支」起。
    //   ‧ 天德、月德以「月支（月令）」起。
    //   ‧ 空亡：該柱地支落在「日柱旬空」即標記。
    //   祿神=日干臨官位、羊刃=日干帝旺位、飛刃=羊刃對沖，皆由十二長生推得。
    //   「德秀」因各家差異大，暫未實作（見工具下方說明）。

    // 天乙貴人（甲戊庚牛羊、乙己鼠猴鄉、丙丁豬雞位、壬癸兔蛇藏、六辛逢馬虎）
    const TIANYI = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['寅', '午']
    };
    // 文昌貴人
    const WENCHANG = {
        '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
        '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
    };
    // 沐浴桃花（日干→沐浴位；師承表，2026-08-08 入）
    const MUYU = { '甲': '子', '乙': '巳', '丙': '卯', '丁': '申', '戊': '卯', '己': '申', '庚': '午', '辛': '亥', '壬': '酉', '癸': '寅' };
    // 紅艷桃花（紅艷煞，日干→地支；師承表，2026-08-08 入）
    const HONGYAN = { '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申' };
    // 十靈日（日柱本身；聰明秀氣；師承，2026-08-08）
    const SHILING = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未'];
    // 德秀貴人（依月支三合局 → 天干德/秀；師承，2026-08-08。逐柱標；成格版待議 TODO_NAKAI）
    const DEXIU = {
        fire: { de: ['丙', '丁'], xiu: ['戊', '癸'] },
        water: { de: ['壬', '癸', '戊', '己'], xiu: ['丙', '辛', '甲', '己'] },
        metal: { de: ['庚', '辛'], xiu: ['乙', '庚'] },
        wood: { de: ['甲', '乙'], xiu: ['丁', '壬'] }
    };
    // 金輿（年干與日干 → 地支；主得妻財、富貴；師承，2026-08-08）
    const JINYU = { '甲': '辰', '乙': '巳', '丙': '未', '戊': '未', '丁': '申', '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅' };
    // 紅鸞（依年支）
    const HONGLUAN = {
        '子': '卯', '丑': '寅', '寅': '丑', '卯': '子', '辰': '亥', '巳': '戌',
        '午': '酉', '未': '申', '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
    };
    function tianXiOf(yearBranch) {
        const hl = HONGLUAN[yearBranch];
        if (!hl) return null;
        const i = EARTHLY_BRANCHES.indexOf(hl);
        return EARTHLY_BRANCHES[(i + 6) % 12]; // 天喜為紅鸞對宮
    }
    // 天德貴人（依月支；值可為天干或地支）
    const TIANDE = {
        '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
        '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
    };
    // 三合局：地支 → 局別
    const TRIAD_GROUP = {
        '申': 'water', '子': 'water', '辰': 'water',
        '寅': 'fire', '午': 'fire', '戌': 'fire',
        '巳': 'metal', '酉': 'metal', '丑': 'metal',
        '亥': 'wood', '卯': 'wood', '未': 'wood'
    };
    // 各三合局對應的神煞地支
    const TRIAD_SHENSHA = {
        '驛馬': { water: '寅', fire: '申', metal: '亥', wood: '巳' },
        '咸池桃花': { water: '酉', fire: '卯', metal: '午', wood: '子' },
        '華蓋': { water: '辰', fire: '戌', metal: '丑', wood: '未' },
        '將星': { water: '子', fire: '午', metal: '酉', wood: '卯' },
        '劫煞': { water: '巳', fire: '亥', metal: '寅', wood: '申' },
        '災煞': { water: '午', fire: '子', metal: '卯', wood: '酉' },
        '亡神': { water: '亥', fire: '巳', metal: '申', wood: '寅' }
    };
    // 年支直取系（孤辰、寡宿依方局；喪門、吊客為年支±2；Nakai 定 2026-08-08）
    const YEARBR_SHENSHA = {
        '孤辰': { '子': '寅', '丑': '寅', '寅': '巳', '卯': '巳', '辰': '巳', '巳': '申', '午': '申', '未': '申', '申': '亥', '酉': '亥', '戌': '亥', '亥': '寅' },
        '寡宿': { '子': '戌', '丑': '戌', '寅': '丑', '卯': '丑', '辰': '丑', '巳': '辰', '午': '辰', '未': '辰', '申': '未', '酉': '未', '戌': '未', '亥': '戌' },
        '喪門': { '子': '寅', '丑': '卯', '寅': '辰', '卯': '巳', '辰': '午', '巳': '未', '午': '申', '未': '酉', '申': '戌', '酉': '亥', '戌': '子', '亥': '丑' },
        '吊客': { '子': '戌', '丑': '亥', '寅': '子', '卯': '丑', '辰': '寅', '巳': '卯', '午': '辰', '未': '巳', '申': '午', '酉': '未', '戌': '申', '亥': '酉' },
        '金匱': { '子': '子', '丑': '酉', '寅': '午', '卯': '卯', '辰': '子', '巳': '酉', '午': '午', '未': '卯', '申': '子', '酉': '酉', '戌': '午', '亥': '卯' },
        '龍德': { '子': '未', '丑': '申', '寅': '酉', '卯': '戌', '辰': '亥', '巳': '子', '午': '丑', '未': '寅', '申': '卯', '酉': '辰', '戌': '巳', '亥': '午' }
    };
    // 三煞（劫煞、災煞、庫煞；以年支與日支三合局「並取」；三合局所沖之方；Nakai 定 2026-08-08）
    const SANSHA_POS = {
        fire:  { '劫煞（三煞）': '亥', '災煞（三煞）': '子', '庫煞（三煞）': '丑' },
        wood:  { '劫煞（三煞）': '申', '災煞（三煞）': '酉', '庫煞（三煞）': '戌' },
        water: { '劫煞（三煞）': '巳', '災煞（三煞）': '午', '庫煞（三煞）': '未' },
        metal: { '劫煞（三煞）': '寅', '災煞（三煞）': '卯', '庫煞（三煞）': '辰' }
    };
    // 月德（依月支三合局 → 天干）
    const YUEDE = { fire: '丙', water: '壬', wood: '甲', metal: '庚' };

    /**
     * 取某柱所帶的神煞清單
     * @param {string} pillarGZ 該柱干支
     * @param {Object} ctx { dayStem, dayBranch, yearBranch, monthBranch, dayKongWang }
     */
    function getShenSha(pillarGZ, ctx) {
        if (!pillarGZ) return [];
        const stem = pillarGZ.charAt(0);
        const branch = pillarGZ.charAt(1);
        const out = [];

        // —— 干系（以日干為主）——
        if (TIANYI[ctx.dayStem] && TIANYI[ctx.dayStem].indexOf(branch) !== -1) {
            out.push('天乙貴人');
            // 自坐貴人：日柱坐在日干的天乙貴人上（僅丁酉、丁亥、癸卯、癸巳四日）
            if (stem === ctx.dayStem && branch === ctx.dayBranch) out.push('自坐貴人');
        }
        if (WENCHANG[ctx.dayStem] === branch) out.push('文昌');
        if (MUYU[ctx.dayStem] === branch) out.push('沐浴桃花');
        if (HONGYAN[ctx.dayStem] === branch) out.push('紅艷桃花');
        if (stem === ctx.dayStem && branch === ctx.dayBranch && SHILING.indexOf(pillarGZ) !== -1) out.push('十靈日');
        if (JINYU[ctx.yearStem] === branch || JINYU[ctx.dayStem] === branch) out.push('金輿');
        const dxGrp = TRIAD_GROUP[ctx.monthBranch];
        if (DEXIU[dxGrp] && (DEXIU[dxGrp].de.indexOf(stem) !== -1 || DEXIU[dxGrp].xiu.indexOf(stem) !== -1)) out.push('德秀貴人');
        if (branchOfStage(ctx.dayStem, '臨官') === branch) out.push('祿神');
        const yangRen = branchOfStage(ctx.dayStem, '帝旺');
        if (yangRen === branch) out.push('羊刃');
        if (yangRen) {
            const feiRen = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf(yangRen) + 6) % 12];
            if (feiRen === branch) out.push('飛刃');
        }

        // —— 年支系 ——
        if (HONGLUAN[ctx.yearBranch] === branch) out.push('紅鸞');
        if (tianXiOf(ctx.yearBranch) === branch) out.push('天喜');

        // —— 三合系起局：全部以年支起（Nakai 確認 2026-08-08）——
        //    桃花(咸池)、驛馬、華蓋、將星、劫煞、災煞、亡神 皆以「年支」三合局。
        const yGrp = TRIAD_GROUP[ctx.yearBranch];
        if (yGrp) {
            Object.keys(TRIAD_SHENSHA).forEach(name => {
                if (TRIAD_SHENSHA[name][yGrp] === branch) out.push(name);
            });
        }
        // —— 年支直取系（孤辰、寡宿、喪門、吊客）——
        Object.keys(YEARBR_SHENSHA).forEach(name => {
            if (YEARBR_SHENSHA[name][ctx.yearBranch] === branch) out.push(name);
        });
        // —— 三煞（劫煞、災煞、庫煞；年支與日支三合局並取、去重）——
        [TRIAD_GROUP[ctx.yearBranch], TRIAD_GROUP[ctx.dayBranch]].forEach(g => {
            if (!g || !SANSHA_POS[g]) return;
            Object.keys(SANSHA_POS[g]).forEach(name => {
                if (SANSHA_POS[g][name] === branch && out.indexOf(name) === -1) out.push(name);
            });
        });

        // —— 月支系 ——
        const tdVal = TIANDE[ctx.monthBranch];
        if (tdVal && (tdVal === stem || tdVal === branch)) out.push('天德');
        const mgrp = TRIAD_GROUP[ctx.monthBranch];
        if (mgrp && YUEDE[mgrp] === stem) out.push('月德');

        // —— 空亡（落在日柱旬空）——
        if (ctx.dayKongWang && ctx.dayKongWang.indexOf(branch) !== -1) out.push('空亡');

        return out;
    }

    // ---- 大運 ----
    // 節（十二節，非中氣）對應 getTerm 的奇數序號：立春3、驚蟄5…小寒1
    function _jieTimesOfYear(sl, year) {
        const arr = [];
        for (let n = 1; n <= 23; n += 2) {
            const t = sl.getTerm(year, n);
            if (t) arr.push(t);
        }
        return arr;
    }

    /**
     * 計算起運歲數（3 日折 1 年）
     * @param {Object} birth { year, month, day, hour }
     * @param {boolean} forward 順排 true / 逆排 false
     * @returns {{ startAge:number, days:number }}
     */
    function getLuckStartAge(birth, forward) {
        const sl = _getSolarLunar();
        const birthMs = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour || 0);
        let candidates = [];
        if (forward) {
            candidates = _jieTimesOfYear(sl, birth.year).concat(_jieTimesOfYear(sl, birth.year + 1))
                .filter(t => t > birthMs);
            candidates.sort((a, b) => a - b);
        } else {
            candidates = _jieTimesOfYear(sl, birth.year - 1).concat(_jieTimesOfYear(sl, birth.year))
                .filter(t => t < birthMs);
            candidates.sort((a, b) => b - a);
        }
        if (!candidates.length) {
            // 節氣資料不足（如 2100 年末順排需 2101 年節氣）→ 明確標記，勿默默回 0 歲（M2）
            return { startAge: 0, days: 0, dataMissing: true };
        }
        const days = Math.abs(candidates[0] - birthMs) / 86400000;
        return { startAge: days / 3, days: days };
    }

    /**
     * 排大運：回傳起運資訊與前 N 步大運柱
     * 順逆規則：陽年男 / 陰年女 → 順排；陰年男 / 陽年女 → 逆排（年干定陰陽）。
     * @param {Object} birth { year, month, day, hour }
     * @param {string} gender '男' | '女'
     * @param {string} yearStem 年柱天干
     * @param {string} monthPillar 月柱干支（大運由月柱推排）
     * @param {number} steps 排幾步（預設 10）
     */
    function getLuckCycle(birth, gender, yearStem, monthPillar, steps) {
        steps = steps || 10;
        const yang = isYangStem(yearStem);
        const forward = (yang && gender === '男') || (!yang && gender === '女');
        const startInfo = getLuckStartAge(birth, forward);
        const monthIdx = ganZhiIndex(monthPillar);
        const pillars = [];
        for (let k = 1; k <= steps; k++) {
            const idx = forward ? monthIdx + k : monthIdx - k;
            pillars.push({
                step: k,
                pillar: ganZhiFromIndex(idx),
                startAge: startInfo.startAge + (k - 1) * 10
            });
        }
        return { forward: forward, startAge: startInfo.startAge, startDays: startInfo.days, dataMissing: !!startInfo.dataMissing, pillars: pillars };
    }

    // 以查詢日期計算虛歲（實足年齡，用來定位當前大運）
    function _ageAtDate(birth, qY, qM, qD) {
        const bMs = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour || 0);
        const qMs = Date.UTC(qY, qM - 1, qD);
        return (qMs - bMs) / (365.2425 * 86400000);
    }

    /**
     * 取查詢日期當下生效的大運柱（未起運回傳 null）
     */
    function getCurrentLuckPillar(cycle, birth, qY, qM, qD) {
        const age = _ageAtDate(birth, qY, qM, qD);
        if (age < cycle.startAge) return null; // 尚未起運
        let cur = null;
        for (let i = 0; i < cycle.pillars.length; i++) {
            if (age >= cycle.pillars[i].startAge) cur = cycle.pillars[i];
            else break;
        }
        return cur;
    }

    // ============================================================
    // 八、細盤表格：把八柱（流日/流月/流年/大運 + 年月日時）整理成
    //     可直接渲染的列資料。截圖式版面由 HTML 負責排版。
    // ============================================================

    /**
     * 計算單一柱的所有列資料
     * @param {string} gz 該柱干支（可為 null → 回傳占位）
     * @param {Object} ctx 共用脈絡（含 dayStem 等）
     * @param {boolean} isDay 是否為日柱（主星顯示元男/元女）
     */
    function computePillarCell(gz, ctx, isDay) {
        if (!gz) {
            return {
                pillar: null, stem: '', branch: '',
                mainStar: '—', stemElement: '', branchElement: '',
                hiddenStems: [], xingYun: '', ziZuo: '',
                kongWang: [], naYin: '', shenSha: []
            };
        }
        const stem = gz.charAt(0);
        const branch = gz.charAt(1);
        const hidden = (BRANCH_HIDDEN_STEMS_FULL[branch] || []).map(hs => ({
            stem: hs, tenGod: getTenGod(ctx.dayStem, hs)
        }));
        const mainStar = isDay
            ? ('元' + (ctx.gender === '女' ? '女' : '男'))
            : getTenGod(ctx.dayStem, stem);
        return {
            pillar: gz,
            stem: stem,
            branch: branch,
            stemElement: getElementOf(stem),
            branchElement: getElementOf(branch),
            mainStar: mainStar,
            hiddenStems: hidden,
            xingYun: getTwelveStage(ctx.dayStem, branch),  // 星運：柱支對日主
            ziZuo: getTwelveStage(stem, branch),            // 自坐：柱干坐柱支
            kongWang: KONG_WANG_RULES[gz] || [],
            naYin: getNaYin(gz),
            shenSha: getShenSha(gz, ctx)
        };
    }

    /**
     * 建立細盤表格資料
     * 欄位順序（左→右）：流日、流月、流年、大運 ｜ 年柱、月柱、日柱、時柱
     * @param {Object} chart computeChart 的回傳
     * @param {number} qY 查詢年（流年/大運基準）
     * @param {number} qM 查詢月（流月基準）
     * @param {number} qD 查詢日（流日基準）
     */
    function buildDetailGrid(chart, qY, qM, qD) {
        const p = chart.pillars;
        const dayStem = p.dayPillar.charAt(0);
        const ctx = {
            dayStem: dayStem,
            dayBranch: p.dayPillar.charAt(1),
            yearStem: p.yearPillar.charAt(0),
            yearBranch: p.yearPillar.charAt(1),
            monthBranch: p.monthPillar.charAt(1),
            dayKongWang: chart.kongWang || [],
            gender: (chart.meta && chart.meta.gender) || '男'
        };

        // 動態四曜
        const annualGZ = getAnnualPillar(qY);
        const monthlyGZ = getMonthlyPillar(qY, qM, qD);
        const dailyGZ = getDailyPillar(qY, qM, qD);

        // 大運
        const birth = chart.meta.solarBirth;
        const cycle = getLuckCycle(birth, ctx.gender, p.yearPillar.charAt(0), p.monthPillar);
        const curLuck = cycle.dataMissing ? null : getCurrentLuckPillar(cycle, birth, qY, qM, qD);
        const daYunGZ = curLuck ? curLuck.pillar : null;

        function ageLabel(a) {
            const yrs = Math.floor(a);
            const mos = Math.round((a - yrs) * 12);
            return mos > 0 ? (yrs + '歲' + mos + '個月') : (yrs + '歲');
        }

        const columns = [
            { role: '流日', sub: qY + '/' + qM + '/' + qD, cell: computePillarCell(dailyGZ, ctx, false), dynamic: true },
            { role: '流月', sub: '節氣月', cell: computePillarCell(monthlyGZ, ctx, false), dynamic: true },
            { role: '流年', sub: qY + '年', cell: computePillarCell(annualGZ, ctx, false), dynamic: true },
            { role: '大運', sub: curLuck ? (ageLabel(curLuck.startAge) + '起') : (cycle.dataMissing ? '節氣資料不足' : '未起運'), cell: computePillarCell(daYunGZ, ctx, false), dynamic: true },
            // 本命四柱：視覺由右至左為「年 月 日 時」（年柱最右），故左→右排為 時、日、月、年
            { role: '時柱', sub: '本命', cell: computePillarCell(p.hourPillar, ctx, false), dynamic: false },
            { role: '日柱', sub: '日主', cell: computePillarCell(p.dayPillar, ctx, true), dynamic: false, isDay: true },
            { role: '月柱', sub: '本命', cell: computePillarCell(p.monthPillar, ctx, false), dynamic: false },
            { role: '年柱', sub: '本命', cell: computePillarCell(p.yearPillar, ctx, false), dynamic: false }
        ];

        return {
            query: { year: qY, month: qM, day: qD },
            luck: {
                forward: cycle.forward,
                startAge: cycle.startAge,
                startAgeLabel: ageLabel(cycle.startAge),
                current: curLuck,
                pillars: cycle.pillars
            },
            columns: columns
        };
    }

    // ============================================================
    // 對外暴露
    // ============================================================

    return {
        // solarLunar 注入接口
        setSolarLunar: setSolarLunar,
        // 資料表注入接口（relations/clash/palace/health；不傳則自動找全域或 require）
        setTables: setTables,
        // 常數（唯讀參考）
        constants: {
            HEAVENLY_STEMS, EARTHLY_BRANCHES, DAY_MASTER_DATA, BRANCH_ELEMENTS,
            ELEMENT_IMAGERY, STEM_INTERACTIONS, BRANCH_INTERACTIONS, TEN_GODS_MAP,
            TEN_GODS_EXPLANATIONS, BRANCH_HIDDEN_STEMS, BRANCH_HIDDEN_STEMS_FULL,
            KONG_WANG_RULES, ELEMENT_GENERATES, ELEMENT_OVERCOMES
        },
        // 基礎工具
        getDayMasterData, getElementOf, getTenGod, getElementRelation,
        // 排盤
        calculateFourPillars, calculateHourPillar, getAnnualPillar,
        getMonthlyPillar, getDailyPillar,
        // 分析
        getDayMasterInfo, analyzeFullTenGods, analyzeElementDistribution,
        calculateKongWang, analyzeElementInteraction, analyzeTenGodsInteraction,
        findTianKeDiChongYears, analyzeTimePillar, analyzeDateLayers,
        // 身強身弱 + 喜用神
        analyzeStrength, selectYongShen,
        // 動態層深度整合（合會刑沖破害 × 喜用神 × 養生）
        analyzeActivation, analyzeDynamics,
        // 細盤新增：十二長生 / 納音 / 神煞 / 大運 / 表格
        getTwelveStage, getNaYin, ganZhiIndex, ganZhiFromIndex,
        getShenSha, getLuckStartAge, getLuckCycle, getCurrentLuckPillar,
        computePillarCell, buildDetailGrid,
        // 整合主入口
        computeChart
    };
}));
