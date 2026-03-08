import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GraduationCap, ArrowLeft, Loader2, ChevronDown, ChevronUp, Maximize2, BookOpen, Upload, X } from 'lucide-react';
import { SKILL_CATEGORIES, useStore } from '../store';
import { SkillInfoModal } from '../components/SkillInfoModal';
import { ImageModal } from '../components/ImageModal';
import { GrantSkillModal } from '../components/GrantSkillModal';
import { SKILL_DESCRIPTIONS } from '../data/skillDescriptions';
import { calculateSkillProgress, calculateSpecialSkillStatus, SKILL_THRESHOLDS, EXAM_REQUIRED_SKILLS, getSkillTitleClass, applyAgeRestrictions } from '../lib/skillUtils';
import { User } from '../lib/api/types';
import castleImg from '../assets/castle.png';
import scrollImg from '../assets/scroll.png';
import frameSvg from '../assets/frame.svg';
import storyIcon from '../assets/story.svg';
import avatarSvg from '../assets/avatar.svg';
import gryffindorEmblem from '../assets/gryffindor.svg';
import infoSvg from '../assets/info.svg';

interface Skill {
  id: string;
  name: string;
  progress: number;
  level?: number;
  applicationStatus?: string;
  approvedCount?: number;
  hasExamPassed?: boolean;
  ageCapMessage?: string;
}

const ALL_SKILLS = Array.from(new Set(SKILL_CATEGORIES.flatMap(c => c.skills)));

export const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedSkillInfo, setSelectedSkillInfo] = useState<string | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user: currentUser } = useStore();
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantTargetSkill, setGrantTargetSkill] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportSkill, setSelectedExportSkill] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportableSkills, setExportableSkills] = useState<string[]>([]);

  const getSkillBlockReason = (skillName: string) => {
    // Check Race restrictions FIRST (requested priority)
    if (user?.race) {
        const race = user.race.toLowerCase();
        
        // Animagi restrictions
        if (skillName === 'Анимагия') {
            if (race.includes('вейла')) return 'ВЕЙЛАМ';
            if (race.includes('великан')) return 'ВЕЛИКАНАМ';
            if (race.includes('оборотень')) return 'ОБОРОТНЯМ';
        }

        // Mortimagic, Metamorphomagic, Providence restrictions
        if (['Мортимагия', 'Метаморфомагия', 'Провидение'].includes(skillName)) {
            if (race.includes('вейла')) return 'ВЕЙЛАМ';
            if (race.includes('оборотень')) return 'ОБОРОТНЯМ';
        }
        
        // Giant restrictions for multiple skills
        const blockedForGiants = [
            'Артефакторика', 
            'Магия пространства', 
            'Мортимагия', 
            'Самостоятельная левитация', 
            'Легилименция', 
            'Окклюменция', 
            'Метаморфомагия', 
            'Провидение',
            'Некромантия'
        ];
        
        // Vampire & Dhampir restrictions
        const blockedForVampires = [
            'Магия пространства', 
            'Телесный патронус', 
            'Трансгрессия', 
            'Метаморфомагия', 
            'Провидение'
        ];
        if (blockedForVampires.includes(skillName)) {
            if (race.includes('вампир')) return 'ВАМПИРАМ';
            if (race.includes('дампир')) return 'ДАМПИРАМ';
        }

        if (blockedForGiants.includes(skillName)) {
            if (race.includes('великан')) return 'ВЕЛИКАНАМ';
        }
    }

    // Check Mutually exclusive skills AFTER race checks
    const animagiaSkill = skills.find(s => s.name === 'Анимагия');
    const mortimagiaSkill = skills.find(s => s.name === 'Мортимагия');
    const spaceMagicSkill = skills.find(s => s.name === 'Магия пространства');
    const transgressionSkill = skills.find(s => s.name === 'Трансгрессия');

    if (skillName === 'Мортимагия' && animagiaSkill && (animagiaSkill.progress > 0 || animagiaSkill.level > 0)) {
        return 'АНИМАГАМ НЕДОСТУПНА МОРТИМАГИЯ';
    }
    if (skillName === 'Анимагия' && mortimagiaSkill && (mortimagiaSkill.progress > 0 || mortimagiaSkill.level > 0)) {
        return 'МОРТИМАГАМ НЕДОСТУПНА АНИМАГИЯ';
    }
    if (skillName === 'Трансгрессия' && spaceMagicSkill && (spaceMagicSkill.progress > 0 || spaceMagicSkill.level > 0)) {
        return 'МАГАМ ПРОСТРАНСТВА НЕДОСТУПНА ТРАНСГРЕССИЯ';
    }
    if (skillName === 'Магия пространства' && transgressionSkill && (transgressionSkill.progress > 0 || transgressionSkill.level > 0)) {
        return 'ТРАНСГРЕССИРУЮЩИМ НЕДОСТУПНА МАГИЯ ПРОСТРАНСТВА';
    }

    return null;
  };

  const getDeclension = (number: number, titles: [string, string, string]) => {
      const cases = [2, 0, 1, 1, 1, 2];
      return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  };

  const getSkillNextStepInfo = (skill: Skill) => {
    if (skill.ageCapMessage) return skill.ageCapMessage;
    const count = skill.approvedCount || 0;
    
    // Special Skills
    if (['Метаморфомагия', 'Провидение'].includes(skill.name)) {
        if (skill.level === 1) {
            const needed = 10 - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} до повышения уровня`;
        } else if (skill.level === 2) {
            const needed = 15 - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} до повышения уровня`;
        } else if (skill.level === 3) {
            return 'Максимальный уровень';
        }
        return null;
    }
    
    // Standard Skills
    const threshold = SKILL_THRESHOLDS[skill.name] || 100;
    const isExamRequired = EXAM_REQUIRED_SKILLS.includes(skill.name);
    
    if (isExamRequired) {
        if (skill.hasExamPassed) return 'Максимальный уровень';
        
        if (count < threshold) {
            const needed = threshold - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} и экзамен`;
        } else {
            return 'Требуется сдать экзамен';
        }
    } else {
        if (skill.hasExamPassed) return 'Максимальный уровень';

        if (count < threshold) {
            const needed = threshold - count;
            return `Ещё ${needed} ${getDeclension(needed, ['пост', 'поста', 'постов'])} до завершения`;
        } else {
             return 'Максимальный уровень';
        }
    }
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    SKILL_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {})
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
        ...prev,
        [categoryName]: !prev[categoryName]
    }));
  };

  const fetchProfile = async () => {
    if (!username) return;

    setIsLoading(true);
    try {
      // Replace underscores with spaces to find the user in DB
      const dbName = username?.replace(/_/g, ' ');

      // 1. Find user by name (case insensitive search)
      const userData = await api.auth.getUserByName(dbName || '');

      if (!userData) {
        throw new Error('Волшебник не найден');
      }
      setUser(userData);

      // 2. Fetch logs
      const logsData = await api.logs.list(userData.id);

      // 3. Calculate progress
      const progressMap = new Map<string, number>();
      const examPassedMap = new Map<string, boolean>();
      const applicationStatusMap = new Map<string, string>();
      const exportableSkillSet = new Set<string>();
      
      logsData?.forEach(log => {
        if (log.type === 'application') {
            const existing = applicationStatusMap.get(log.skill_name);
            if (existing !== 'approved') {
                applicationStatusMap.set(log.skill_name, log.status);
            }
            return;
        }
        if (log.status === 'approved') {
            const current = progressMap.get(log.skill_name) || 0;
            progressMap.set(log.skill_name, current + 1);
        }
        if (log.status === 'exam_passed' || log.status === 'study_completed') {
            examPassedMap.set(log.skill_name, true);
            const current = progressMap.get(log.skill_name) || 0;
            progressMap.set(log.skill_name, current + 1);
        }
        if (log.status !== 'rejected' && log.type !== 'completion_request') {
            exportableSkillSet.add(log.skill_name);
        }
      });

      const calculatedSkills = ALL_SKILLS.map(name => {
          const count = progressMap.get(name) || 0;
          const hasExamPassed = examPassedMap.get(name) || false;
          const age = userData.age;
          
          if (['Метаморфомагия', 'Провидение'].includes(name)) {
              const base = calculateSpecialSkillStatus(count);
              const adjusted = applyAgeRestrictions(name, age, count, base.progress, base.level, userData.role === 'admin');
              
              return {
                  id: name,
                  name,
                  progress: adjusted.progress,
                  level: adjusted.level,
                  applicationStatus: applicationStatusMap.get(name),
                  approvedCount: count,
                  ageCapMessage: adjusted.ageCapMessage
              };
          }

          const baseProgress = calculateSkillProgress(name, count, hasExamPassed, age, userData.role === 'admin');
          const adjusted = applyAgeRestrictions(name, age, count, baseProgress, undefined, userData.role === 'admin');
          return {
              id: name,
              name,
              progress: adjusted.progress,
              applicationStatus: applicationStatusMap.get(name),
              approvedCount: count,
              hasExamPassed,
              ageCapMessage: adjusted.ageCapMessage
          };
      });

      setSkills(calculatedSkills);
      const exportable = calculatedSkills
        .map(skill => skill.name)
        .filter(name => exportableSkillSet.has(name));
      setExportableSkills(exportable);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Also listen for changes in the store to re-fetch if someone deleted logs
    // This is important because the admin might delete logs from the detail page
    // and then come back to the profile.
    const unsubscribe = useStore.subscribe((state) => {
        // We can't easily check what changed, so we just check if the profile's user is the same as the one being viewed
        // and if skills changed. But simpler is just to re-fetch on focus or mount.
        // For now, let's rely on fetchProfile being called when username changes or on mount.
    });
    return () => unsubscribe();
  }, [username]);

  useEffect(() => {
    if (!showExportModal) return;
    if (!exportableSkills.length) {
      setSelectedExportSkill('');
      return;
    }
    const exists = exportableSkills.includes(selectedExportSkill);
    if (!exists) {
      setSelectedExportSkill(exportableSkills[0]);
    }
  }, [showExportModal, exportableSkills, selectedExportSkill]);

  const escapeXml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const createZipBlob = (files: { name: string; content: string }[]) => {
    const encoder = new TextEncoder();
    const crcTable = (() => {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i += 1) {
        let c = i;
        for (let k = 0; k < 8; k += 1) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
      return table;
    })();

    const crc32 = (data: Uint8Array) => {
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i += 1) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    };

    const fileParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    files.forEach(file => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = encoder.encode(file.content);
      const crc = crc32(dataBytes);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, 0, true);
      localView.setUint16(12, 0, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      fileParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);

      offset += localHeader.length + dataBytes.length;
    });

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const centralOffset = offset;

    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    endView.setUint16(20, 0, true);

    const allParts = [...fileParts, ...centralParts, endRecord];
    return new Blob(allParts as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  type DocxParagraph = { text: string; style?: 'Heading1' | 'Heading2' | 'Heading3' };

  const createDocxBlob = (paragraphs: DocxParagraph[]) => {
    const paragraphXml = paragraphs.map(paragraph => {
      if (!paragraph.text && !paragraph.style) {
        return '<w:p/>';
      }
      const styleXml = paragraph.style ? `<w:pPr><w:pStyle w:val="${paragraph.style}"/></w:pPr>` : '';
      const textXml = paragraph.text
        ? `<w:r><w:t xml:space="preserve">${escapeXml(paragraph.text)}</w:t></w:r>`
        : '<w:r/>';
      return `<w:p>${styleXml}${textXml}</w:p>`;
    }).join('');

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    return createZipBlob([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: relsXml },
      { name: 'word/document.xml', content: documentXml },
      { name: 'word/_rels/document.xml.rels', content: documentRelsXml }
    ]);
  };

  const splitIntoParagraphs = (text: string) => {
    const lines = text.split(/\r?\n/);
    return lines.length ? lines : [''];
  };

  const handleExportSkill = async () => {
    if (!selectedExportSkill || !user || isExporting) return;
    if (!exportableSkills.includes(selectedExportSkill)) return;
    setIsExporting(true);
    try {
      const logs = await api.logs.list(user.id, selectedExportSkill);
      const visibleLogs = (logs || [])
        .filter(log => log.status !== 'rejected' && log.type !== 'completion_request' && log.type !== 'application')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const exportedAt = new Date().toLocaleString('ru-RU');
      const paragraphs: DocxParagraph[] = [];

      paragraphs.push({ text: selectedExportSkill, style: 'Heading1' });
      paragraphs.push({ text: `Автор: ${user.name}` });
      paragraphs.push({ text: `Экспортировано: ${exportedAt}` });
      paragraphs.push({ text: '' });

      if (!visibleLogs.length) {
        paragraphs.push({ text: 'Нет данных для экспорта.' });
      } else {
        visibleLogs.forEach((log, index) => {
          const date = new Date(log.created_at).toLocaleDateString('ru-RU');
          paragraphs.push({ text: `Пост ${index + 1}`, style: 'Heading3' });
          paragraphs.push({ text: `Дата: ${date}` });
          if (log.post_link) {
            paragraphs.push({ text: `Ссылка: ${log.post_link}` });
          }
          splitIntoParagraphs(log.content).forEach(line => {
            paragraphs.push({ text: line });
          });
          paragraphs.push({ text: '' });
        });
      }

      const blob = createDocxBlob(paragraphs);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedExportSkill}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (e) {
      setError('Не удалось экспортировать данные.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGrantSkill = async (reason: string) => {
        if (!grantTargetSkill || !user || !currentUser) return;
        await api.admin.grantSkill(user.id, grantTargetSkill, reason, currentUser.id);
        await fetchProfile();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hogwarts-blue relative">
        <div className="absolute inset-0 z-0">
            <img src={castleImg} alt="Castle" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="relative z-10 p-8 bg-white/90 rounded-lg shadow-xl">
             <Loader2 className="w-8 h-8 animate-spin text-hogwarts-red mx-auto" />
             <p className="mt-4 font-serif text-hogwarts-ink">Поиск волшебника...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-hogwarts-blue relative">
        <div className="absolute inset-0 z-0">
            <img src={castleImg} alt="Castle" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="relative z-10 p-8 bg-white/90 rounded-lg shadow-xl text-center max-w-md">
             <h2 className="text-2xl font-magical text-hogwarts-red mb-2">Ошибка</h2>
             <p className="font-serif text-hogwarts-ink mb-6">{error}</p>
             <button
               onClick={() => navigate('/')}
               className="px-6 py-2 bg-hogwarts-blue text-white rounded hover:bg-hogwarts-blue/90 font-serif"
             >
               На главную
             </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src={castleImg} 
          alt="Hogwarts Castle" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
      </div>

      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        <div className="max-w-4xl mx-auto p-4 md:p-8 w-full mt-4 md:mt-8">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-white hover:text-hogwarts-gold mb-8 font-magical font-bold transition-colors font-serif"
            >
                <ArrowLeft className="w-5 h-5" />
                На главную
            </button>

            <div className="relative mb-8 md:mb-12">
                <div className="absolute inset-0 bg-black/50 hidden md:block [@media(orientation:landscape)]:block"></div>
                <img
                  src={frameSvg}
                  alt="Frame"
                  className="absolute inset-0 w-full h-full object-fill z-10 pointer-events-none select-none hidden md:block [@media(orientation:landscape)]:block"
                />
                <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden [@media(orientation:landscape)]:hidden rounded-lg"></div>

                <div className="relative z-10 flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row gap-4 md:gap-6 items-center px-6 py-6 md:px-14 md:py-8 [@media(orientation:landscape)]:px-12 [@media(orientation:landscape)]:py-8">
                    <div className="relative">
                        <div className={`w-16 h-16 md:w-24 md:h-24 [@media(orientation:landscape)]:w-24 [@media(orientation:landscape)]:h-24 flex items-center justify-center shrink-0 overflow-hidden relative ${user?.avatar_url ? 'bg-hogwarts-blue rounded-full border-4 border-hogwarts-gold shadow-lg' : ''}`}>
                            {user?.avatar_url ? (
                                <img 
                                    src={user.avatar_url} 
                                    alt={user.name} 
                                    className="w-full h-full object-cover cursor-pointer" 
                                    onClick={() => setShowAvatarModal(true)}
                                />
                            ) : (
                                <img src={avatarSvg} alt="Default Avatar" className="w-full h-full object-contain" />
                            )}
                        </div>
                        {user?.avatar_url && (
                            <button
                                onClick={() => setShowAvatarModal(true)}
                                className="absolute -bottom-1 -right-1 md:bottom-0 md:right-0 translate-x-1/4 translate-y-1/4 bg-hogwarts-gold text-hogwarts-ink p-1 md:p-1.5 rounded-full shadow-md hover:bg-yellow-400 transition-colors z-20"
                                title="Посмотреть фото"
                            >
                                <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                            </button>
                        )}
                    </div>
                    
                    <ImageModal 
                        isOpen={showAvatarModal}
                        onClose={() => setShowAvatarModal(false)}
                        imageUrl={user?.avatar_url || ''}
                        altText={user?.name || 'Avatar'}
                    />

                    <div className="text-center md:text-left [@media(orientation:landscape)]:text-left w-full md:ml-2 [@media(orientation:landscape)]:ml-2">
                        <div className="flex items-center justify-center md:justify-start [@media(orientation:landscape)]:justify-start gap-3 mb-1">
                          {currentUser && user && currentUser.id === user.id && (
                            <div className="flex items-center justify-center shrink-0">
                              <img
                                src={storyIcon}
                                alt="Сюжеты"
                                className="w-12 h-12 md:w-16 md:h-16 object-contain select-none"
                              />
                            </div>
                          )}
                          <h2 className="text-xl md:text-4xl [@media(orientation:landscape)]:text-4xl font-seminaria font-bold text-hogwarts-gold">
                            {username?.replace(/_/g, ' ')}
                          </h2>
                        </div>
                        <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-3 md:gap-4 justify-center md:justify-between [@media(orientation:landscape)]:justify-between">
                            <p className="text-base md:text-xl [@media(orientation:landscape)]:text-xl text-white font-century">
                                Карточка навыков
                            </p>
                            <div className="flex items-center gap-3">
                              {username && (
                                <button
                                  onClick={() => navigate(`/u/${username}/stories`)}
                                  className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all text-sm"
                                >
                                  <BookOpen className="w-5 h-5" />
                                  Сюжеты
                                </button>
                              )}
                              {user && (
                                <button
                                  onClick={() => setShowExportModal(true)}
                                  className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all text-sm"
                                >
                                  <Upload className="w-5 h-5" />
                                  Экспорт
                                </button>
                              )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showExportModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
                onClick={() => setShowExportModal(false)}
              >
                <div
                  className="relative w-full max-w-lg bg-hogwarts-parchment rounded-lg shadow-2xl border-4 border-hogwarts-gold flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="absolute top-4 right-4 text-hogwarts-ink hover:text-hogwarts-red transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="p-6 border-b-2 border-hogwarts-bronze bg-hogwarts-parchment">
                    <h2 className="text-xl md:text-2xl font-seminaria text-hogwarts-red font-bold">
                      Экспорт навыка
                    </h2>
                    <p className="text-sm md:text-base text-hogwarts-ink/80 font-century mt-2">
                      Выберите навык для экспорта
                    </p>
                  </div>
                  <div className="p-6 flex flex-col gap-4">
                    <select
                      value={selectedExportSkill}
                      onChange={(e) => setSelectedExportSkill(e.target.value)}
                      disabled={!exportableSkills.length || isExporting}
                      className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                    >
                      {exportableSkills.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {!exportableSkills.length && (
                      <div className="text-sm text-hogwarts-ink/70 font-century">
                        Пока нет данных для экспорта
                      </div>
                    )}
                    {isExporting && (
                      <div className="text-sm text-hogwarts-ink/70 font-century">
                        Экспорт...
                      </div>
                    )}
                  </div>
                  <div className="p-6 border-t-2 border-hogwarts-bronze bg-hogwarts-parchment flex justify-end gap-3 md:gap-4">
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="px-3 py-1.5 md:px-6 md:py-2 text-hogwarts-ink font-magical hover:bg-hogwarts-bronze/10 rounded border border-hogwarts-bronze transition-colors font-nexa uppercase text-xs md:text-base"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleExportSkill}
                      disabled={!selectedExportSkill || isExporting || !exportableSkills.length}
                      className={`px-3 py-1.5 md:px-6 md:py-2 font-magical font-bold rounded border-2 border-hogwarts-gold shadow-md transition-all font-nexa uppercase text-xs md:text-base
                        ${selectedExportSkill && !isExporting && exportableSkills.length
                          ? 'bg-hogwarts-red text-hogwarts-gold hover:bg-red-900'
                          : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
                    >
                      {isExporting ? 'Экспорт...' : 'Экспортировать'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-12">
            {SKILL_CATEGORIES.map((category) => (
                <div key={category.name} className="relative">
                    <button 
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center gap-4 mb-6 group text-left"
                    >
                        <div className="h-[1px] bg-hogwarts-gold/50 flex-grow group-hover:bg-hogwarts-gold transition-colors"></div>
                        <h2 className="text-2xl md:text-3xl font-seminaria font-bold text-hogwarts-gold group-hover:text-yellow-400 transition-colors flex items-center gap-2">
                            {category.name}
                            {expandedCategories[category.name] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </h2>
                        <div className="h-[1px] bg-hogwarts-gold/50 flex-grow group-hover:bg-hogwarts-gold transition-colors"></div>
                    </button>

                    {expandedCategories[category.name] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 [@media(orientation:landscape)]:grid-cols-2 gap-3 md:gap-8 [@media(orientation:landscape)]:gap-4 animate-fadeIn">
                        {category.skills.map((skillName) => {
                            const originalSkill = skills.find(s => s.name === skillName);
                            if (!originalSkill) return null;
                            
                            const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
                            const canModerate = currentUser?.role === 'admin' || (currentUser?.role === 'moderator' && currentUser?.managed_skills?.includes(originalSkill.name));
                            const blockReason = getSkillBlockReason(skillName);
                            const isBlocked = !!blockReason;

                            // In PublicProfile, we show blocking based on the target user's race
                            // but admins/moderators can still click to moderate if they need to
                            const shouldShowAsBlocked = isBlocked;
                            const canClick = !isBlocked || isAdminOrModerator;

                            // Force 0% progress if blocked
                            const skill = isBlocked ? { ...originalSkill, progress: 0 } : originalSkill;

                            return (
                                <div 
                                key={`${category.name}-${skill.id}`} 
                                onClick={() => canClick && navigate(`/u/${username}/skill/${encodeURIComponent(skill.name)}`)}
                                className={`p-4 md:p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-all bg-no-repeat bg-center bg-cover md:bg-contain ${shouldShowAsBlocked ? 'opacity-60 grayscale-[0.3]' : ''} ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                style={{ backgroundImage: `url(${scrollImg})` }}
                                >
                                <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                                {shouldShowAsBlocked && (
                                    <div className="absolute inset-0 bg-black/30 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-6">
                                        <span className="text-white font-bold text-center text-xs md:text-sm lg:text-base leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] uppercase" style={{ fontFamily: 'RobotoforLearning-Medium_0' }}>
                                            {blockReason.includes('НЕДОСТУПНА') || blockReason.includes('НЕДОСТУПНО') ? blockReason : `ЭТОТ НАВЫК НЕДОСТУПЕН ${blockReason}`}
                                        </span>
                                    </div>
                                )}
                                <div className="relative z-10 flex flex-col justify-between items-center mb-2 gap-1 md:gap-0">
                                    <div className="flex items-center gap-1 justify-center w-full relative px-1">
                                        <h3 className={`font-seminaria font-bold text-hogwarts-blue text-center whitespace-nowrap ${getSkillTitleClass(skill.name)} ${shouldShowAsBlocked ? 'opacity-50' : ''}`}>
                                            {skill.name === 'Самостоятельная левитация' ? 'Самост. левитация' : skill.name}
                                        </h3>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSkillInfo(skill.name);
                                            }}
                                            className="p-1 text-hogwarts-blue/50 hover:text-hogwarts-blue transition-colors rounded-full hover:bg-hogwarts-blue/10 shrink-0"
                                            title="Информация о навыке"
                                        >
                                            <img src={infoSvg} alt="Информация" className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div 
                                    className={`w-[78%] mx-auto md:w-full h-4 md:h-5 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden ${shouldShowAsBlocked ? 'grayscale opacity-50' : ''}`}
                                    onMouseEnter={() => {
                                        if (!shouldShowAsBlocked) {
                                            setActiveTooltip(skill.name);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        if (!shouldShowAsBlocked) {
                                            setActiveTooltip(null);
                                        }
                                    }}
                                >
                                    <div
                                        className="h-full overflow-hidden transition-all duration-1000 ease-out relative"
                                        style={{ width: `${skill.progress}%` }}
                                    >
                                        <div 
                                            className="h-full bg-gradient-to-r from-hogwarts-red via-hogwarts-gold to-hogwarts-green absolute top-0 left-0"
                                            style={{ width: `${skill.progress > 0 ? (100 / skill.progress * 100) : 0}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/10 opacity-30"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-2 flex justify-center text-[10px] font-bold text-hogwarts-ink/70 font-nexa uppercase gap-2 relative z-10 w-full">
                                    {/* Tooltip positioned relative to the container (center of progress bar) */}
                                    {getSkillNextStepInfo(skill) && !shouldShowAsBlocked && (
                                        <div className={`
                                            absolute bottom-full mb-2 px-3 py-2 left-1/2 -translate-x-1/2
                                            bg-black text-white text-xs rounded-md shadow-xl whitespace-nowrap z-50
                                            border border-hogwarts-gold/30
                                            after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-black
                                            ${activeTooltip === skill.name ? 'block' : 'hidden'}
                                        `}>
                                            {getSkillNextStepInfo(skill)}
                                        </div>
                                    )}

                                    <div 
                                        className={`relative group inline-flex flex-col items-center ${shouldShowAsBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!shouldShowAsBlocked) {
                                                setActiveTooltip(activeTooltip === skill.name ? null : skill.name);
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            e.stopPropagation();
                                            if (!shouldShowAsBlocked) {
                                                setActiveTooltip(skill.name);
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.stopPropagation();
                                            if (!shouldShowAsBlocked) {
                                                setActiveTooltip(null);
                                            }
                                        }}
                                    >
                                        <span>{skill.progress}%</span>
                                    </div>
                                    {skill.level && (
                                        <span className="text-hogwarts-blue">{skill.level}-й уровень</span>
                                    )}
                                    
                                    {canModerate && skill.progress < 100 && (
                                         <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGrantTargetSkill(skill.name);
                                                setGrantModalOpen(true);
                                            }}
                                            className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 bg-hogwarts-green text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-md hover:bg-hogwarts-green/90 transition-colors z-20"
                                            title="Повысить уровень до 100%"
                                        >
                                            +100%
                                        </button>
                                    )}

                                    {['Метаморфомагия', 'Провидение'].includes(skill.name) && skill.applicationStatus && skill.applicationStatus !== 'approved' && (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`
                                                ${skill.applicationStatus === 'pending' ? 'text-hogwarts-gold' : ''}
                                                ${skill.applicationStatus === 'rejected' ? 'text-hogwarts-red' : ''}
                                            `}>
                                                {skill.applicationStatus === 'pending' && '(ЗАЯВКА НА РАССМОТРЕНИИ)'}
                                                {skill.applicationStatus === 'rejected' && '(ЗАЯВКА ОТКЛОНЕНА)'}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/u/${username}/skill/${encodeURIComponent(skill.name)}`);
                                                }}
                                                className="text-[10px] text-hogwarts-blue hover:text-hogwarts-gold underline underline-offset-2 transition-colors cursor-pointer"
                                            >
                                                Просмотреть заявку
                                            </button>
                                        </div>
                                    )}
                                </div>
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            ))}
            </div>
        </div>
      </div>
      
      <SkillInfoModal
        isOpen={!!selectedSkillInfo}
        onClose={() => setSelectedSkillInfo(null)}
        title={selectedSkillInfo || ''}
        description={selectedSkillInfo ? SKILL_DESCRIPTIONS[selectedSkillInfo] : ''}
      />

      <GrantSkillModal 
        isOpen={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        onConfirm={handleGrantSkill}
        skillName={grantTargetSkill || ''}
        userName={user?.name || ''}
      />
    </div>
  );
};
