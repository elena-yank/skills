
export const SKILL_THRESHOLDS: Record<string, number> = {
    "Мортимагия": 15,
    "Анимагия": 15,
    "Беспалочковая магия": 15,
    "Невербальная магия": 10,
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
    // If exam is passed, progress is 100%
    if (hasExamPassed) return 100;

    const threshold = SKILL_THRESHOLDS[skillName] || 100;
    
    // For skills requiring exam, cap at 90% if exam not passed
    // But wait, if threshold is 15, and we have 15 posts. 15/15 = 100%.
    // We want 15 posts to be 90%.
    // So effective threshold for 100% would be higher? No.
    // User said: "15 posts = 90%".
    // So 1 post = 6%. 15 * 6 = 90.
    // This implies the "full" threshold is actually 15 / 0.9 = 16.666...
    // Or we can just calculate normally based on 15, then multiply by 0.9?
    // Let's treat the threshold as the "max practice posts needed".
    // If exam required, max practice gives 90%.
    
    const isExamRequired = EXAM_REQUIRED_SKILLS.includes(skillName);
    
    let percentage = (approvedCount / threshold) * 100;
    
    if (isExamRequired) {
        // Scale so that threshold count = 90%
        // i.e. if count == threshold, we want 90%.
        // percentage = (count / threshold) * 90;
        percentage = (approvedCount / threshold) * 90;
        
        // Cap at 90% if exam not passed
        return Math.min(Math.round(percentage), 90);
    }

    return Math.min(Math.round(percentage), 100);
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
