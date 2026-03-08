
export const SKILL_THRESHOLDS: Record<string, number> = {
    "Мортимагия": 15,
    "Анимагия": 15,
    "Беспалочковая магия": 15,
    "Невербальная магия": 15,
    "Телесный патронус": 5,
    "Легилименция": 20,
    "Окклюменция": 20,
    "Магия пространства": 20,
    "Самостоятельная левитация": 20,
    "Артефакторика": 25,
    "Некромантия": 25,
    "Трансгрессия": 5
};

export const EXAM_REQUIRED_SKILLS = ["Анимагия", "Артефакторика", "Некромантия", "Трансгрессия"];

const isHogwartsAge = (age?: string) => {
    if (!age) return false;
    const normalized = age.toLowerCase();
    return normalized === "хогвартс" || normalized === "школа";
};

export const calculateSkillProgress = (skillName: string, approvedCount: number, hasExamPassed: boolean = false, age?: string, isAdmin: boolean = false): number => {
    if (hasExamPassed) return 100;

    const threshold = SKILL_THRESHOLDS[skillName] || 100;
    let percentage = (approvedCount / threshold) * 90;
    let progress = Math.min(Math.round(percentage), 90);

    if (!isAdmin && isHogwartsAge(age) && (skillName === "Легилименция" || skillName === "Окклюменция")) {
        if (approvedCount <= 10) {
            progress = Math.min(50, Math.round((approvedCount / 10) * 50));
        }
        if (approvedCount >= 10) {
            progress = 50;
        }
    }

    return progress;
};

export const calculateSpecialSkillStatus = (approvedCount: number): { level: number; progress: number } => {
    if (approvedCount < 10) {
        return { level: 1, progress: Math.min(Math.round((approvedCount / 10) * 100), 100) };
    }
    if (approvedCount < 15) {
        const countInLevel = approvedCount - 10;
        return { level: 2, progress: Math.min(Math.round((countInLevel / 5) * 100), 100) };
    }
    return { level: 3, progress: 100 };
};

export const applyAgeRestrictions = (
    skillName: string,
    age: string | undefined,
    approvedCount: number,
    baseProgress: number,
    baseLevel?: number,
    isAdmin: boolean = false
): { progress: number; level?: number; ageCapMessage?: string } => {
    let progress = baseProgress;
    let level = baseLevel;
    let ageCapMessage: string | undefined;

    if (isAdmin || !isHogwartsAge(age)) {
        return { progress, level, ageCapMessage };
    }

    if (skillName === "Легилименция" || skillName === "Окклюменция") {
        if (approvedCount >= 10) {
            progress = 50;
            ageCapMessage = "ДАЛЬНЕЙШЕЕ ОСВОЕНИЕ В МД";
        }
    }

    if (skillName === "Метаморфомагия" && approvedCount >= 10) {
        level = 2;
        progress = 100;
        ageCapMessage = "ДАЛЬНЕЙШЕЕ ОСВОЕНИЕ В МД";
    }

    return { progress, level, ageCapMessage };
};

export const calculateMetamorphmagusStatus = calculateSpecialSkillStatus;

export const getSkillTitleClass = (name: string) => {
    return "text-lg sm:text-xl md:text-2xl lg:text-3xl whitespace-nowrap";
};

export const getSkillHeaderClass = (name: string) => {
    if (name.length > 20) {
        return "text-lg md:text-2xl lg:text-3xl";
    }
    if (name.length > 15) {
        return "text-xl md:text-3xl lg:text-4xl";
    }
    return "text-2xl md:text-4xl lg:text-5xl";
};
