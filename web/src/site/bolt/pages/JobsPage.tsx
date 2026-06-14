import { useState } from 'react';
import { Briefcase, Users, ArrowLeft, MapPin, Clock, Lock, Download, ChevronRight, Search } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import { jobPosts, jobProfiles } from '../data/mockData';
import type { JobPost, JobProfile } from '../types';

interface JobsPageProps {
  user?: { email: string } | null;
  onLoginClick?: () => void;
  onBack: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  '정규직': 'bg-primary-50 text-primary-700 border-primary-100',
  '계약직': 'bg-amber-50 text-amber-700 border-amber-100',
  '인턴': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  '파트타임': 'bg-orange-50 text-orange-700 border-orange-100',
};

function JobCard({ job }: { job: JobPost }) {
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-primary-200 hover:shadow-card-hover transition-all group cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {job.certified && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 bg-primary-50 text-primary-600 border border-primary-100 rounded-full">
                <VlueBrandMark size={10} />
                인증기관
              </span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[job.type] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}>
              {job.type}
            </span>
          </div>
          <h3 className="text-gray-900 font-bold text-sm group-hover:text-primary-600 transition-colors" style={{ wordBreak: 'keep-all' }}>
            {job.title}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors mt-0.5" />
      </div>
      <div>
        <p className="text-primary-600 text-xs font-semibold mb-1">{job.company}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
          {job.salary && <span className="text-gray-600 font-medium">{job.salary}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.deadline} 마감</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
        {job.tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">{t}</span>
        ))}
      </div>
      <button className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors">
        <Download className="w-3.5 h-3.5" />
        VLUE 이력서 즉시 지원
      </button>
    </div>
  );
}

function ProfileCard({ profile }: { profile: JobProfile }) {
  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-primary-200 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="text-gray-900 font-bold text-sm">{profile.name}</p>
          <p className="text-primary-600 text-xs font-semibold">{profile.field}</p>
        </div>
        <div className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${profile.available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'}`}>
          {profile.available ? '구직중' : '구직완료'}
        </div>
      </div>
      <div className="text-xs text-gray-500 space-y-0.5">
        <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">경력</span><span>{profile.experience}</span></div>
        <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">지역</span><span>{profile.location}</span></div>
        <div className="flex gap-2"><span className="text-gray-400 w-12 flex-shrink-0">학력</span><span>{profile.education}</span></div>
      </div>
      <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
        {profile.tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full border border-primary-100">{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function JobsPage({ user, onLoginClick, onBack }: JobsPageProps) {
  const [tab, setTab] = useState<'posts' | 'profiles'>('posts');
  const [query, setQuery] = useState('');

  const filteredPosts = jobPosts.filter((j) =>
    query === '' ||
    j.title.toLowerCase().includes(query.toLowerCase()) ||
    j.company.toLowerCase().includes(query.toLowerCase())
  );

  const isCorpUser = !!user;

  return (
    <main className="min-h-screen bg-blue-tint pt-[60px]">
      <div className="bg-primary-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </button>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/80 text-sm font-semibold">VLUE 인증 기관 채용</span>
              </div>
              <h1 className="text-3xl font-black text-white mb-1">공식 채용</h1>
              <p className="text-white/70 text-sm max-w-xl" style={{ wordBreak: 'keep-all' }}>
                VLUE 인증 기관의 채용공고를 확인하고 VLUE 이력서로 즉시 지원하세요.
              </p>
            </div>

            {tab === 'posts' && (
              <div className="w-full lg:w-[min(100%,440px)] lg:flex-shrink-0">
                <p className="mb-2 text-xs font-bold tracking-wide text-white/90">채용공고 검색</p>
                <div className="relative rounded-2xl bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-2 ring-white/30">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-500" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="직무명, 회사명으로 검색..."
                    className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-[15px] font-semibold text-gray-900 placeholder:font-medium placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
                <p className="mt-2 text-right text-xs font-semibold text-white/75">
                  총 {filteredPosts.length}개의 채용공고
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setTab('posts')}
            className={`p-6 rounded-3xl border-2 text-left transition-all ${tab === 'posts' ? 'border-primary-500 bg-primary-50 shadow-card' : 'border-gray-200 bg-white hover:border-primary-200'}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-gray-900 font-black text-lg mb-1" style={{ letterSpacing: '-0.03em' }}>채용공고 리스트</h2>
            <p className="text-gray-500 text-sm" style={{ wordBreak: 'keep-all' }}>
              VLUE 인증 기관의 채용 정보를 확인하세요. 모든 회원이 열람 가능합니다.
            </p>
          </button>
          <button
            onClick={() => setTab('profiles')}
            className={`p-6 rounded-3xl border-2 text-left transition-all relative ${tab === 'profiles' ? 'border-primary-500 bg-primary-50 shadow-card' : 'border-gray-200 bg-white hover:border-primary-200'}`}
          >
            {!isCorpUser && (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                <Lock className="w-3 h-3" />
                기업회원
              </div>
            )}
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-gray-900 font-black text-lg mb-1" style={{ letterSpacing: '-0.03em' }}>구직희망 리스트</h2>
            <p className="text-gray-500 text-sm" style={{ wordBreak: 'keep-all' }}>
              인재풀을 확인하세요. 스탠다드 이상 기업 회원만 열람 가능합니다.
            </p>
          </button>
        </div>

        {tab === 'posts' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {tab === 'profiles' && !isCorpUser && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-gray-900 font-bold text-base mb-2">기업 회원(스탠다드 이상)만 열람 가능합니다</h3>
            <p className="text-gray-400 text-sm mb-5 max-w-sm" style={{ wordBreak: 'keep-all' }}>
              구직 희망자 인재풀 열람은 스탠다드 이상의 인증을 보유한 기업 회원에게만 제공됩니다.
            </p>
            <button
              onClick={() => { if (!user && onLoginClick) onLoginClick(); }}
              className="btn-primary"
            >
              인증신청 보기
            </button>
          </div>
        )}

        {tab === 'profiles' && isCorpUser && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              총 <span className="font-semibold text-gray-900">{jobProfiles.length}명</span>의 구직 희망자
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobProfiles.map((p) => <ProfileCard key={p.id} profile={p} />)}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
