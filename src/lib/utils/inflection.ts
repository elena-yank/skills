import petrovich from 'petrovich';

/**
 * Склоняет имя в родительный падеж (кого? чего?).
 * Используется для заголовков типа "Сюжеты Амелии Уизли".
 */
export function inflectName(fullName: string): string {
  if (!fullName || fullName.trim() === '') return fullName;

  const parts = fullName.trim().split(/\s+/);
  
  let firstName = '';
  let lastName = '';
  let middleName = '';

  // Простая эвристика для распределения частей имени
  if (parts.length === 1) {
    firstName = parts[0];
  } else if (parts.length === 2) {
    firstName = parts[0];
    lastName = parts[1];
  } else {
    firstName = parts[0];
    middleName = parts[1];
    lastName = parts.slice(2).join(' ');
  }

  // Пытаемся определить пол
  let gender: 'male' | 'female' | 'androgynous' = 'androgynous';
  
  if (middleName) {
    // @ts-ignore
    const detected = petrovich.detect_gender(middleName);
    if (detected !== 'androgynous') {
      gender = detected;
    }
  }

  // Если пол все еще не определен, попробуем по имени
  if (gender === 'androgynous') {
    const fn = firstName.toLowerCase();
    
    // Женские имена часто заканчиваются на -а, -я, -и
    if (fn.endsWith('а') || fn.endsWith('я') || fn.endsWith('ия')) {
      // Исключения для мужских имен на -а/-я (Никита, Илья)
      const maleExceptions = ['никита', 'илья', 'данила', 'савва', 'лука'];
      if (maleExceptions.includes(fn)) {
        gender = 'male';
      } else {
        gender = 'female';
      }
    } 
    // Мужские имена часто заканчиваются на согласную, -й, -ь
    else if (fn.endsWith('й') || fn.endsWith('ь') || /[^аяеёиоуыэю]$/.test(fn)) {
      // Исключения для женских имен на согласную/ь (Любовь)
      const femaleExceptions = ['любовь', 'нинель'];
      if (femaleExceptions.includes(fn)) {
        gender = 'female';
      } else {
        gender = 'male';
      }
    }
    // Гарри, Рон, Альбус - мужские
    const knownMaleWizards = ['гарри', 'рон', 'альбус', 'северус', 'драко', 'невилл', 'сириус', 'римус', 'артур', 'фред', 'джордж', 'перси', 'билл', 'чарли', 'хёнджин', 'дрейк', 'дерек', 'дориан', 'барти'];
    const knownFemaleWizards = ['гермиона', 'джинни', 'луна', 'молли', 'беллатриса', 'нарцисса', 'минерва', 'флёр', 'нимфадора', 'юна', 'триша', 'лана', 'альцина', 'елена', 'айла'];
    
    if (knownMaleWizards.includes(fn)) gender = 'male';
    if (knownFemaleWizards.includes(fn)) gender = 'female';
  }

  try {
    const person: any = {
      gender,
      first: firstName,
      last: lastName,
      middle: middleName
    };

    // @ts-ignore
    const declined = petrovich(person, 'genitive');
    
    // Специальные исправления для фамилий из мира ГП
    if (declined.last === 'Малфого') declined.last = 'Малфоя';
    
    // Имя Драко не склоняется в родительном падеже
    if (firstName.toLowerCase() === 'драко') declined.first = 'Драко';
    
    const resultParts = [];
    if (declined.first) resultParts.push(declined.first);
    if (declined.middle) resultParts.push(declined.middle);
    if (declined.last) resultParts.push(declined.last);
    
    return resultParts.join(' ');
  } catch (e) {
    console.error('Error inflecting name:', e);
    return fullName;
  }
}
