
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

export const calculateSkillProgress = (skillName: string, approvedCount: number, hasExamPassed: boolean = false): number => {
    // If exam is passed or study is completed (marked as passed), progress is 100%
    if (hasExamPassed) return 100;

    const threshold = SKILL_THRESHOLDS[skillName] || 100;
    
    // Calculate percentage based on approved posts
    // For both exam and non-exam skills, we now cap at 90% from posts alone.
    // 100% is only achievable via Exam (for exam skills) or "Complete Study" button (for non-exam skills).
    
    // Scale so that threshold count = 90%
    let percentage = (approvedCount / threshold) * 90;
    
    // Cap at 90%
    return Math.min(Math.round(percentage), 90);
};

export const calculateSpecialSkillStatus = (approvedCount: number): { level: number; progress: number } => {
    // Level 1: 0-10 posts (0-100%)
    if (approvedCount < 10) {
        return { level: 1, progress: Math.min(Math.round((approvedCount / 10) * 100), 100) };
    }
    // Level 2: 10-15 posts (0-100%)
    // 10 posts = 0% of Level 2
    // 15 posts = 100% of Level 2
    if (approvedCount < 15) {
        const countInLevel = approvedCount - 10;
        return { level: 2, progress: Math.min(Math.round((countInLevel / 5) * 100), 100) };
    }
    // Level 3: 15+ posts (100%)
    return { level: 3, progress: 100 };
};

// Alias for backward compatibility if needed, but we will update all usages
export const calculateMetamorphmagusStatus = calculateSpecialSkillStatus;

export const getSkillTitleClass = (name: string) => {
    // Uniform increased size for all skills
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
