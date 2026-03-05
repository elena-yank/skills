import React, { useEffect, useState, useRef } from 'react';
import { Plus, LogOut, GraduationCap, Share2, Check, Users, ChevronDown, ChevronUp, Maximize2, Upload, Settings, BookOpen, X } from 'lucide-react';
import { Notifications } from '../components/Notifications';
import { SettingsModal } from '../components/SettingsModal';
import { useStore, SKILL_CATEGORIES } from '../store';
import { PracticeModal } from '../components/PracticeModal';
import { SkillInfoModal } from '../components/SkillInfoModal';
import { ImageModal } from '../components/ImageModal';
import { ImageCropper } from '../components/ImageCropper';
import { api } from '../lib/api';
import { SKILL_DESCRIPTIONS } from '../data/skillDescriptions';
import { EXAM_REQUIRED_SKILLS, SKILL_THRESHOLDS, getSkillTitleClass } from '../lib/skillUtils';
import { useNavigate } from 'react-router-dom';
import castleImg from '../assets/castle.png';
import scrollImg from '../assets/scroll.png';
import frameSvg from '../assets/frame.svg';
import schyotchikSvg from '../assets/schyotchik.svg';
import addSvg from '../assets/app_14577552.svg';
import avatarSvg from '../assets/avatar.svg';
import infoSvg from '../assets/info.svg';

export const Dashboard: React.FC = () => {
  const { user, skills, fetchSkills, signOut, addPracticeLog, isLoading } = useStore();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [selectedSkillInfo, setSelectedSkillInfo] = useState<string | null>(null);
  const [isExamMode, setIsExamMode] = useState(false);
  const [isApplicationMode, setIsApplicationMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [adminView, setAdminView] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCategory, setExportCategory] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [userStoriesCount, setUserStoriesCount] = useState<number | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [animateProgress, setAnimateProgress] = useState(false);
  const initialProgressShown = useRef(false);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (wasLoading.current && !isLoading && !initialProgressShown.current) {
      initialProgressShown.current = true;
      setTimeout(() => setAnimateProgress(true), 0);
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    setIsTouchDevice(hasTouch);
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;
    const handleTouchStart = (event: TouchEvent) => {
      if (!activeTooltip) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const inside = target.closest('[data-skill-tooltip-container="true"]');
      if (!inside) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('touchstart', handleTouchStart);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isTouchDevice, activeTooltip]);

  const handleCompletionRequest = async (skillName: string) => {
    if (!confirm('Вы уверены, что хотите подать заявку на завершение обучения?')) return;
    
    try {
        await addPracticeLog(skillName, 'Заявка на завершение обучения', 0, '', true, 'completion_request');
        alert('Заявка успешно отправлена!');
    } catch (error) {
        console.error(error);
        alert('Ошибка при отправке заявки');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Размер файла не должен превышать 3 МБ');
      return;
    }

    // Read file for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleCropComplete = async (croppedImage: string) => {
    setImageToCrop(null);
    setIsUploading(true);
    if (user) {
        try {
            // @ts-ignore
            const updatedUser = await api.users.updateAvatar(user.id, croppedImage);
            // We need to update the user in the store
            const { setUser } = useStore.getState(); 
            setUser({ ...user, avatar_url: updatedUser.avatar_url });
        } catch (error) {
            console.error('Failed to update avatar:', error);
            alert('Не удалось обновить фото');
        }
    }
    setIsUploading(false);
  };

  const handleCropCancel = () => {
    setImageToCrop(null);
  };

  const getDeclension = (number: number, titles: [string, string, string]) => {
      const cases = [2, 0, 1, 1, 1, 2];
      return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  };

  const getSkillNextStepInfo = (skill: any) => {
    if (skill.ageCapMessage) return skill.ageCapMessage;
    if (skill.isLocked) return null;
    if (skill.progress >= 100) return 'Максимальный уровень';
    
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

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'moderator') {
      fetchSkills(!adminView);
    } else {
      fetchSkills();
    }
  }, [fetchSkills, adminView, user?.role]);

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    api.stories.list(user.id)
      .then(stories => {
        if (isMounted) setUserStoriesCount(stories.length);
      })
      .catch(() => {
        if (isMounted) setUserStoriesCount(0);
      });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleCopyLink = () => {
    const safeName = user?.name.replace(/\s+/g, '_');
    const url = `${window.location.origin}/u/${safeName}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportOptions = React.useMemo(() => {
    const skillOptions = skills
      .filter(skill => (skill.totalPosts ?? 0) > 0)
      .map(skill => ({
        id: skill.name,
        label: skill.name,
        kind: 'skill' as const
      }));
    const storyOptions = userStoriesCount && userStoriesCount > 0
      ? [{ id: '__stories__', label: 'Моя история', kind: 'stories' as const }]
      : [];
    return [...skillOptions, ...storyOptions];
  }, [skills, userStoriesCount]);

  useEffect(() => {
    if (!exportOptions.length) {
      setExportCategory('');
      return;
    }
    const hasSelected = exportOptions.some(option => option.id === exportCategory);
    if (!hasSelected) {
      setExportCategory(exportOptions[0].id);
    }
  }, [exportOptions, exportCategory]);

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

  const handleExport = async () => {
    if (!user || !exportCategory) return;
    const option = exportOptions.find(item => item.id === exportCategory);
    if (!option) return;
    setIsExporting(true);
    try {
      const exportedAt = new Date().toLocaleString('ru-RU');
      const paragraphs: DocxParagraph[] = [];

      if (option.kind === 'skill') {
        const logs = await api.logs.list(user.id, option.id);
        const visibleLogs = logs
          .filter(log => log.status !== 'rejected' && log.type !== 'completion_request')
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        paragraphs.push({ text: option.label, style: 'Heading1' });
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
      } else {
        const stories = await api.stories.list(user.id);
        const storiesWithSegments = await Promise.all(
          stories.map(story => api.stories.get(story.id).catch(() => story))
        );
        paragraphs.push({ text: 'Моя история', style: 'Heading1' });
        paragraphs.push({ text: `Автор: ${user.name}` });
        paragraphs.push({ text: `Экспортировано: ${exportedAt}` });
        paragraphs.push({ text: '' });

        if (!storiesWithSegments.length) {
          paragraphs.push({ text: 'Нет данных для экспорта.' });
        } else {
          storiesWithSegments.forEach(story => {
            paragraphs.push({ text: story.title || 'Без названия', style: 'Heading2' });
            if (story.authors) {
              paragraphs.push({ text: `Авторы: ${story.authors}` });
            }
            const segments = (story.segments || []).sort((a, b) => a.position - b.position);
            if (!segments.length) {
              paragraphs.push({ text: 'Нет сегментов.' });
            } else {
              segments.forEach((segment, index) => {
                paragraphs.push({ text: `Сегмент ${index + 1}`, style: 'Heading3' });
                if (segment.author) {
                  paragraphs.push({ text: `Автор: ${segment.author}` });
                }
                if (segment.link) {
                  paragraphs.push({ text: `Ссылка: ${segment.link}` });
                }
                splitIntoParagraphs(segment.content || '').forEach(line => {
                  paragraphs.push({ text: line });
                });
              });
            }
            paragraphs.push({ text: '' });
          });
        }
      }
      const blob = createDocxBlob(paragraphs);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${option.label}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      console.error(error);
      alert('Не удалось экспортировать данные.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSkillClick = (skillName: string, initialStatus?: 'pending' | 'approved') => {
    if (isRealAdmin && !adminView) {
      navigate(`/skill/${encodeURIComponent(skillName)}?view=personal`);
    } else {
      if (isRealAdmin && adminView && initialStatus) {
        navigate(`/skill/${encodeURIComponent(skillName)}?status=${initialStatus}`);
      } else {
        navigate(`/skill/${encodeURIComponent(skillName)}`);
      }
    }
  };

  const isRealAdmin = user?.role === 'admin' || user?.role === 'moderator';
  const showAdminInterface = isRealAdmin && adminView;

  const getSkillBlockReason = (skillName: string) => {
    // Skills are NEVER blocked in admin/moderator view
    if (showAdminInterface) return null;
    
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

  // Filter categories for Moderator view
  const visibleCategories = React.useMemo(() => {
    if (user?.role === 'moderator' && showAdminInterface) {
        return SKILL_CATEGORIES.map(cat => ({
            ...cat,
            skills: cat.skills.filter(skill => user.managed_skills?.includes(skill))
        })).filter(cat => cat.skills.length > 0);
    }
    return SKILL_CATEGORIES;
  }, [user, showAdminInterface]);

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
        
        <div className="mb-8 text-center px-4">
            <button
                onClick={() => navigate('/wizards')}
                className="inline-flex items-center justify-center gap-2 text-white hover:text-hogwarts-gold font-bold font-century text-sm md:text-lg transition-colors border-b-2 border-transparent hover:border-hogwarts-gold shadow-sm whitespace-normal text-center leading-tight"
            >
                <Users className="w-5 h-5 shrink-0" />
                Список всех зарегистрированных волшебников
            </button>
        </div>

          <div className="relative mb-3 md:mb-4">
          <div className="absolute inset-0 bg-black/50 hidden md:block [@media(orientation:landscape)]:block"></div>
          <img
            src={frameSvg}
            alt="Frame"
            className="absolute inset-0 w-full h-full object-fill z-10 pointer-events-none select-none hidden md:block [@media(orientation:landscape)]:block"
          />
           <div className="absolute inset-0 border-2 border-hogwarts-gold/50 bg-black/40 md:hidden rounded-lg [@media(orientation:landscape)]:hidden"></div>

          <div className="relative z-50 flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row justify-between items-center px-6 py-6 md:px-14 md:py-6 [@media(orientation:landscape)]:px-12 gap-4 md:gap-0">
            <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-4 md:gap-6 text-center md:text-left [@media(orientation:landscape)]:text-left">
              <div className="relative">
                <div 
                    className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center shrink-0 overflow-hidden relative ${user?.avatar_url ? 'bg-hogwarts-blue rounded-full border-2 border-hogwarts-gold shadow-lg' : ''} ${!showAdminInterface ? 'cursor-pointer group' : ''}`}
                    onClick={!showAdminInterface ? handleAvatarClick : undefined}
                >
                  {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                      <img src={avatarSvg} alt="Default Avatar" className="w-full h-full object-contain" />
                  )}
                  
                  {!showAdminInterface && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-6 h-6 text-white" />
                      </div>
                  )}
                  
                  {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                  )}
                </div>

                {!showAdminInterface && user?.avatar_url && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAvatarModal(true);
                        }}
                        className="absolute -bottom-2 -right-2 md:bottom-0 md:right-0 md:translate-x-1/4 md:translate-y-1/4 bg-hogwarts-gold text-hogwarts-ink p-1 rounded-full shadow-md hover:bg-yellow-400 transition-colors z-20"
                        title="Посмотреть фото"
                    >
                        <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                )}
              </div>

              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
              />

              <div className="md:ml-2 [@media(orientation:landscape)]:ml-2 w-full md:w-auto px-2 md:px-0">
                <div className="relative flex items-center justify-center md:justify-start [@media(orientation:landscape)]:justify-start w-full">
                    <h2 className="text-xl md:text-4xl text-hogwarts-gold font-seminaria font-bold text-center md:text-left">
                        {showAdminInterface ? 'Информация о навыках' : 'Личный кабинет'}
                    </h2>
                    <div className="absolute right-0 md:static md:ml-4">
                      <Notifications />
                    </div>
                </div>
                <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-2 md:gap-4 justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                  <p className="text-white text-sm md:text-lg font-century font-normal">
                    Добро пожаловать, <span className="text-hogwarts-gold">{user?.name || 'Волшебник'}</span>
                  </p>
                </div>
                <div className="flex flex-col md:flex-row [@media(orientation:landscape)]:flex-row items-center gap-4 mt-1 justify-center md:justify-start [@media(orientation:landscape)]:justify-start">
                  {!showAdminInterface && (
                    <button 
                        onClick={handleCopyLink}
                        className="text-xs flex items-center justify-center md:justify-start [@media(orientation:landscape)]:justify-start gap-1 text-white hover:text-hogwarts-gold font-nexa underline uppercase w-full md:w-auto [@media(orientation:landscape)]:w-auto"
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                        {copied ? 'Ссылка скопирована' : 'Поделиться профилем'}
                    </button>
                  )}
                  {isRealAdmin && (
                    <button
                      onClick={() => setAdminView(!adminView)}
                      className="bg-hogwarts-gold text-hogwarts-ink font-century font-bold px-4 py-1 rounded-xl hover:bg-yellow-500 transition-colors shadow-md text-xs md:text-sm whitespace-nowrap w-full md:w-auto [@media(orientation:landscape)]:w-auto"
                    >
                      {adminView ? 'Мои навыки' : 'Панель администратора'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 w-full md:w-auto [@media(orientation:landscape)]:w-auto md:items-end [@media(orientation:landscape)]:items-end">
              <div className="flex w-full justify-end gap-2 md:flex-col [@media(orientation:landscape)]:flex-col">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="flex items-center gap-1 md:gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-3 py-1 md:px-4 md:py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all flex-1 md:flex-none justify-center md:justify-end [@media(orientation:landscape)]:justify-end text-xs md:text-sm"
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  Настройки
                </button>
                {!showAdminInterface && (
                  <div className="flex items-center gap-2 flex-1 md:flex-none justify-center md:justify-end [@media(orientation:landscape)]:justify-end md:hidden [@media(orientation:landscape)]:hidden">
                    <button
                      onClick={() => navigate('/my-stories')}
                      className="flex items-center gap-1 md:gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-3 py-1 md:px-4 md:py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all text-xs md:text-sm whitespace-nowrap"
                    >
                      <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
                      Моя история
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-1 flex w-full justify-end gap-2">
                {!showAdminInterface && (
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-1 md:gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-3 py-1 md:px-4 md:py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all flex-1 md:flex-none justify-center md:justify-end [@media(orientation:landscape)]:justify-end text-xs md:text-sm md:hidden [@media(orientation:landscape)]:hidden"
                  >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    Экспорт
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-1 md:gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-3 py-1 md:px-4 md:py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all flex-1 md:flex-none justify-center md:justify-end [@media(orientation:landscape)]:justify-end text-xs md:text-sm"
                >
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>

        {!showAdminInterface && (
          <div className="mb-3 md:mb-4 hidden md:flex [@media(orientation:landscape)]:flex justify-between px-4 md:px-8 items-center">
            <button
              onClick={() => navigate('/my-stories')}
              className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all text-sm"
            >
              <BookOpen className="w-5 h-5" />
              Моя история
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 text-hogwarts-gold hover:text-yellow-200 font-bold font-century px-4 py-2 border-2 border-transparent hover:border-hogwarts-gold rounded transition-all text-sm"
            >
              <Plus className="w-5 h-5" />
              Экспорт
            </button>
          </div>
        )}

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
                  Экспорт
                </h2>
                <p className="text-sm md:text-base text-hogwarts-ink/80 font-century mt-2">
                  Выберите категорию для экспорта
                </p>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-hogwarts-bronze rounded focus:outline-none focus:border-hogwarts-red transition-colors font-century"
                >
                  {exportOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!exportOptions.length && (
                  <div className="text-sm text-hogwarts-ink/70 font-century">
                    Пока нет данных для экспорта
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
                  onClick={handleExport}
                  disabled={!exportCategory || isExporting}
                  className={`px-3 py-1.5 md:px-6 md:py-2 font-magical font-bold rounded border-2 border-hogwarts-gold shadow-md transition-all font-nexa uppercase text-xs md:text-base
                    ${exportCategory && !isExporting
                      ? 'bg-hogwarts-red text-hogwarts-gold hover:bg-red-900'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400'}`}
                >
                  {isExporting ? 'Экспорт...' : 'Экспортировать'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}

        <div className="space-y-12">
          {visibleCategories.map((category) => (
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
                <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 animate-fadeIn">
                  {category.skills.map((skillName) => {
                     const originalSkill = skills.find(s => s.name === skillName);
                     if (!originalSkill) return null;
                     
                     const blockReason = getSkillBlockReason(skillName);
                     const isBlocked = !!blockReason;
                     
                     // Force 0% progress if blocked
                     const skill = isBlocked ? { ...originalSkill, progress: 0 } : originalSkill;
                     
                     return (
                        <div 
                          key={`${category.name}-${skill.id}`} 
                          className={`px-8 py-4 md:p-12 rounded-lg shadow-md relative overflow-hidden group hover:shadow-xl transition-all bg-no-repeat bg-center bg-[length:100%_100%] md:bg-contain ${isBlocked ? 'opacity-60 grayscale-[0.3]' : ''} flex flex-col items-center justify-center gap-2 md:gap-3 min-h-[140px] md:min-h-[200px] [@media(orientation:portrait)]:py-5 [@media(orientation:portrait)]:min-h-[160px]`}
                          style={{ backgroundImage: `url(${scrollImg})` }}
                        >
                          <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                          {isBlocked && (
                            <div className="absolute inset-0 bg-black/30 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-6">
                                <span className="text-white font-bold text-center text-xs md:text-sm lg:text-base leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] uppercase" style={{ fontFamily: 'RobotoforLearning-Medium_0' }}>
                                    {blockReason.includes('НЕДОСТУПНА') || blockReason.includes('НЕДОСТУПНО') ? blockReason : `ЭТОТ НАВЫК НЕДОСТУПЕН ${blockReason}`}
                                </span>
                            </div>
                          )}
                          <div className="relative z-10 flex flex-col justify-center items-center gap-1 md:gap-0">
                            <div className="flex items-center justify-center w-full relative px-2 gap-1">
                                <h3 
                                onClick={() => !isBlocked && handleSkillClick(skill.name)}
                                className={`font-seminaria font-bold text-hogwarts-blue whitespace-nowrap transform translate-y-[10px] md:translate-y-[12px] ${getSkillTitleClass(skill.name)} ${isBlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:underline decoration-hogwarts-gold underline-offset-4'}`}
                                >
                                {skill.name === 'Самостоятельная левитация' ? 'Самост. левитация' : skill.name}
                                </h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSkillInfo(skill.name);
                                    }}
                                    className="p-1 text-hogwarts-red/50 hover:text-hogwarts-red transition-colors rounded-full hover:bg-hogwarts-red/10 shrink-0"
                                    title="Информация о навыке"
                                >
                                    <img src={infoSvg} alt="Информация" className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>
                            {!showAdminInterface && (
                                <div className="flex items-center gap-2 mt-2">
                                    {EXAM_REQUIRED_SKILLS.includes(skill.name) && skill.progress >= 90 && skill.progress < 100 && !isBlocked && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSkill(skill.name);
                                                setIsExamMode(true);
                                                setIsApplicationMode(false);
                                            }}
                                            className="px-3 py-1 rounded-full text-white font-bold text-[10px] md:text-xs shadow-md hover:shadow-lg transition-all hover:scale-105"
                                            style={{ backgroundColor: '#006633', fontFamily: 'RobotoforLearning-Medium_0' }}
                                        >
                                            СДАТЬ ЭКЗАМЕН
                                        </button>
                                    )}
                                    {!EXAM_REQUIRED_SKILLS.includes(skill.name) && skill.progress >= 90 && skill.progress < 100 && !isBlocked && (
                                        <>
                                            {skill.completionStatus === 'pending' ? (
                                                 <span className="text-[10px] md:text-xs font-bold text-hogwarts-gold bg-hogwarts-ink/50 px-2 py-1 rounded">
                                                     Заявка на рассмотрении
                                                 </span>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCompletionRequest(skill.name);
                                                    }}
                                                    className="px-3 py-1 rounded-full text-white text-[10px] md:text-xs shadow-md hover:shadow-lg transition-all hover:scale-105"
                                                    style={{ backgroundColor: '#006633', fontFamily: 'RobotoforLearning-Medium_0' }}
                                                >
                                                    ПОДАТЬ ЗАЯВКУ НА ЗАВЕРШЕНИЕ
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                          </div>

                          {showAdminInterface ? (
                              // Admin View: Numbers
                              <div 
                                className={`flex items-center justify-center gap-4 cursor-pointer relative ${isBlocked ? 'opacity-50' : ''}`}
                              >
                                  <div 
                                    className="flex flex-col items-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isBlocked) {
                                        handleSkillClick(skill.name, 'approved');
                                      }
                                    }}
                                  >
                                      <span className="text-[10px] uppercase text-hogwarts-ink/50 font-bold font-nexa text-center">Одобрено</span>
                                      <span className="text-2xl md:text-3xl font-magical text-black">{skill.approvedCount || 0}</span>
                                  </div>
                                  <div 
                                    className="flex flex-col items-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isBlocked) {
                                        handleSkillClick(skill.name, 'pending');
                                      }
                                    }}
                                  >
                                      <span className="text-[10px] uppercase text-hogwarts-ink/50 font-bold font-nexa text-center">На проверке</span>
                                      <span className="text-2xl md:text-3xl font-magical text-hogwarts-green">+{skill.pendingCount || 0}</span>
                                  </div>
                              </div>
                          ) : (
                              // User View: Progress Bar
                              <>
                                {skill.isLocked ? (
                                    <div className="flex flex-col items-center gap-2">
                                         <button
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 if (skill.applicationStatus === 'pending' || isBlocked) return;
                                                 setSelectedSkill(skill.name);
                                                 setIsApplicationMode(true);
                                                 setIsExamMode(false);
                                             }}
                                             disabled={skill.applicationStatus === 'pending' || isBlocked}
                                            className={`px-4 py-1.5 rounded-full text-white font-bold text-[10px] md:text-sm shadow-md transition-all font-nexa uppercase ${
                                               isBlocked
                                                 ? 'bg-gray-500 cursor-not-allowed'
                                                 : skill.applicationStatus === 'pending' 
                                                     ? 'bg-gray-400 cursor-not-allowed' 
                                                     : (skill.applicationStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700 hover:shadow-lg' : 'bg-[#006633] hover:shadow-lg')
                                            }`}
                                        >
                                             {isBlocked 
                                                ? 'НЕДОСТУПНО'
                                                : skill.applicationStatus === 'pending' 
                                                    ? 'Заявка на рассмотрении' 
                                                    : (skill.applicationStatus === 'rejected' ? 'Заявка отклонена (Повторить)' : 'Подать заявку')}
                                         </button>
                                         {(skill.applicationStatus === 'pending' || skill.applicationStatus === 'rejected') && !isBlocked && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/skill/${encodeURIComponent(skill.name)}`);
                                                }}
                                                className="text-xs text-hogwarts-gold/70 hover:text-hogwarts-gold underline underline-offset-2 font-serif transition-colors"
                                            >
                                                Просмотреть заявку
                                            </button>
                                         )}
                                     </div>
                            ) : (
                            <>
                                <div className="flex items-center justify-center gap-3 w-full mt-0 md:mt-0">
                                    <div className="relative shrink-0 mr-4">
                                        <img
                                            src={schyotchikSvg}
                                            alt="Количество постов"
                                            className="w-8 h-8 md:w-11 md:h-11 object-contain"
                                        />
                                        <span
                                            className="absolute left-[80%] top-[60%] -translate-y-1/2 text-[12px] md:text-[16px] text-[#740001] leading-none font-bold"
                                            style={{ fontFamily: 'Lumos' }}
                                        >
                                            {skill.totalPosts ?? 0}
                                        </span>
                                    </div>
                                    <div 
                                        data-skill-tooltip-container="true"
                                        className={`flex-1 max-w-[55%] md:max-w-[60%] h-4 md:h-5 bg-hogwarts-silver/20 rounded-full border border-hogwarts-bronze overflow-hidden ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={(e) => {
                                            if (isBlocked) return;
                                            if (isTouchDevice) {
                                                e.stopPropagation();
                                                if (activeTooltip !== skill.name) {
                                                    setActiveTooltip(skill.name);
                                                }
                                                return;
                                            }
                                            handleSkillClick(skill.name);
                                        }}
                                    >
                                        <div
                                            className={`h-full overflow-hidden relative ${animateProgress ? 'transition-all duration-1000 ease-out' : ''}`}
                                            style={{ width: `${skill.progress}%` }}
                                        >
                                            <div 
                                                className={`h-full bg-gradient-to-r from-hogwarts-red via-hogwarts-gold to-hogwarts-green absolute top-0 left-0 ${isBlocked ? 'grayscale' : ''}`}
                                                style={{ width: `${skill.progress > 0 ? (100 / skill.progress * 100) : 0}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/10 opacity-30"></div>
                                            </div>
                                        </div>
                                    </div>
                                    {!skill.isLocked && !isBlocked && !skill.ageCapMessage && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSkill(skill.name);
                                                setIsExamMode(false);
                                                setIsApplicationMode(false);
                                            }}
                                            className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-transform hover:scale-105 flex items-center justify-center"
                                            title="Practise this skill"
                                        >
                                            <img
                                                src={addSvg}
                                                alt="Добавить пост"
                                                className="w-2/3 h-2/3"
                                            />
                                        </button>
                                    )}
                                </div>
                                        
                                        <div className="mt-0 md:mt-0 flex justify-center text-[10px] font-bold text-hogwarts-ink/70 font-nexa uppercase gap-2 relative z-1 transform -translate-y-[8px]">
                                            
                                            {/* Tooltip positioned relative to the container (center of progress bar) */}
                                            {getSkillNextStepInfo(skill) && !isBlocked && (
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
                                                data-skill-tooltip-container="true"
                                                className={`relative group inline-flex flex-col items-center ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isBlocked) return;
                                                    if (isTouchDevice) {
                                                        if (activeTooltip !== skill.name) {
                                                            setActiveTooltip(skill.name);
                                                        }
                                                        return;
                                                    }
                                                    setActiveTooltip(activeTooltip === skill.name ? null : skill.name);
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.stopPropagation();
                                                    if (!isBlocked) {
                                                        setActiveTooltip(skill.name);
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.stopPropagation();
                                                    if (!isBlocked) {
                                                        setActiveTooltip(null);
                                                    }
                                                }}
                                            >
                                                <span>{skill.progress}%</span>
                                            </div>
                                            {skill.level && (
                                                <span className="text-hogwarts-blue">{skill.level}-й уровень</span>
                                            )}
                                        </div>
                                    </>
                                )}
                              </>
                          )}
                        </div>
                     );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <PracticeModal
        skillName={selectedSkill || ''}
        isOpen={!!selectedSkill}
        onClose={() => {
            setSelectedSkill(null);
            setIsExamMode(false);
        }}
        viewAsUser={!showAdminInterface}
        isExam={isExamMode}
        isApplication={isApplicationMode}
      />
      
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      <SkillInfoModal
        isOpen={!!selectedSkillInfo}
        onClose={() => setSelectedSkillInfo(null)}
        title={selectedSkillInfo || ''}
        description={selectedSkillInfo ? (SKILL_DESCRIPTIONS[selectedSkillInfo] || '') : ''}
      />

      <ImageModal 
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          imageUrl={user?.avatar_url || ''}
          altText={user?.name || 'Avatar'}
      />
      </div>
    </div>
  );
};
