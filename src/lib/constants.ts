import { 
  Calculator, 
  Atom, 
  Code2, 
  BookOpen, 
  FlaskConical, 
  Type, 
  Dna, 
  History, 
  Globe2, 
  Layout,
  Search
} from 'lucide-react';

export const SUBJECTS = [
  { 
    id: 'Mathematics', 
    name: 'Mathematics', 
    color: 'bg-blue-500', 
    lightColor: 'bg-blue-50', 
    textColor: 'text-blue-600',
    icon: Calculator 
  },
  { 
    id: 'Physics', 
    name: 'Physics', 
    color: 'bg-purple-500', 
    lightColor: 'bg-purple-50', 
    textColor: 'text-purple-600',
    icon: Atom 
  },
  { 
    id: 'Chemistry', 
    name: 'Chemistry', 
    color: 'bg-pink-500', 
    lightColor: 'bg-pink-50', 
    textColor: 'text-pink-600',
    icon: FlaskConical 
  },
  { 
    id: 'Biology', 
    name: 'Biology', 
    color: 'bg-rose-500', 
    lightColor: 'bg-rose-50', 
    textColor: 'text-rose-600',
    icon: Dna 
  },
  { 
    id: 'Computer Science', 
    name: 'Computer Science', 
    color: 'bg-emerald-500', 
    lightColor: 'bg-emerald-50', 
    textColor: 'text-emerald-600',
    icon: Code2 
  },
  { 
    id: 'English', 
    name: 'English', 
    color: 'bg-amber-500', 
    lightColor: 'bg-amber-50', 
    textColor: 'text-amber-600',
    icon: Type 
  },
  { 
    id: 'History', 
    name: 'History', 
    color: 'bg-orange-500', 
    lightColor: 'bg-orange-50', 
    textColor: 'text-orange-600',
    icon: History 
  },
  { 
    id: 'Geography', 
    name: 'Geography', 
    color: 'bg-cyan-500', 
    lightColor: 'bg-cyan-50', 
    textColor: 'text-cyan-600',
    icon: Globe2 
  },
  { 
    id: 'Other', 
    name: 'Other', 
    color: 'bg-slate-500', 
    lightColor: 'bg-slate-50', 
    textColor: 'text-slate-600',
    icon: Layout 
  }
];

export const getSubjectStyle = (subjectName: string) => {
  const subject = SUBJECTS.find(s => s.name === subjectName);
  return subject || { 
    id: 'Other', 
    name: subjectName, 
    color: 'bg-gray-500', 
    lightColor: 'bg-gray-50', 
    textColor: 'text-gray-600',
    icon: BookOpen 
  };
};
