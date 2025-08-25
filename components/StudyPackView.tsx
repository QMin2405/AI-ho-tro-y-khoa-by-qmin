import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Types from '../types';
import { StudyPack, LearningMode, SummaryContent, QuizDifficulty, ChatMessage, QuizSession, SubmittedAnswer, FillInTheBlank, GlossaryItem } from '../types';
import { useUserStore } from '../store/useUserStore';
import { XP_ACTIONS, PACK_COLORS } from '../constants';
import { processInlineFormatting, markdownToHtml } from '../utils/markdown';
import { 
    ArrowLeftIcon, BookOpenIcon, ClipboardListIcon, PencilIcon, AcademicCapIcon, FireIcon, CheckCircleIcon, XCircleIcon, ChatAlt2Icon, 
    SparklesIcon, ICON_MAP, StethoscopeIcon
} from './icons';

interface MemoizedContentBlockProps {
    block: SummaryContent;
    prevBlockType?: SummaryContent['type'];
}

// Memoized component to render a single content block, preventing re-renders if the block data hasn't changed.
const MemoizedContentBlock: React.FC<MemoizedContentBlockProps> = React.memo(({ block, prevBlockType }) => {
    switch (block.type) {
        case 'heading': {
            const contentWithoutEmoji = block.content.replace(/^[^\p{L}\p{N}]+\s*/u, '').trim();
            const isMainHeading = contentWithoutEmoji.length > 0 && contentWithoutEmoji === contentWithoutEmoji.toUpperCase();

            if (isMainHeading) {
                return <h2 className="text-2xl font-bold mt-8 mb-3 text-medical-blue-light dark:text-medical-blue-dark" dangerouslySetInnerHTML={{ __html: processInlineFormatting(block.content) }} />;
            } else {
                return <h3 className="text-xl font-bold mt-6 mb-2 text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: processInlineFormatting(block.content) }} />;
            }
        }
        case 'paragraph':
            return <p className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: processInlineFormatting(block.content) }} />;
        case 'tip': {
            const showHeader = block.type !== prevBlockType;
            return (
                <div className={`my-4 rounded-lg border-l-4 border-yellow-400 dark:border-yellow-500 bg-tip-yellow-light dark:bg-tip-yellow-dark ${showHeader ? 'p-4' : 'px-4 pb-4 pt-2'}`}>
                    {showHeader && <p className="font-semibold text-yellow-800 dark:text-yellow-200">💡 Mẹo</p>}
                    <div className={`prose prose-sm dark:prose-invert max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 ${showHeader ? 'mt-1' : ''}`} dangerouslySetInnerHTML={{ __html: markdownToHtml(block.content) }} />
                </div>
            );
        }
        case 'warning': {
             const showHeader = block.type !== prevBlockType;
             return (
                <div className={`my-4 rounded-lg border-l-4 border-red-400 dark:border-red-500 bg-warning-red-light dark:bg-warning-red-dark ${showHeader ? 'p-4' : 'px-4 pb-4 pt-2'}`}>
                    {showHeader && <p className="font-semibold text-red-800 dark:text-red-200">⚠️ Cảnh báo</p>}
                    <div className={`prose prose-sm dark:prose-invert max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 ${showHeader ? 'mt-1' : ''}`} dangerouslySetInnerHTML={{ __html: markdownToHtml(block.content) }} />
                </div>
            );
        }
        case 'example': {
            const showHeader = block.type !== prevBlockType;
            return (
                <div className={`my-4 rounded-lg bg-slate-100 dark:bg-gray-700/50 ${showHeader ? 'p-4' : 'px-4 pb-4 pt-2'}`}>
                    {showHeader && <p className="font-semibold text-slate-600 dark:text-slate-300">Ví dụ lâm sàng</p>}
                    <div className={`prose prose-sm dark:prose-invert max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 ${showHeader ? 'mt-1' : ''}`} dangerouslySetInnerHTML={{ __html: markdownToHtml(block.content) }} />
                </div>
            );
        }
        case 'table': {
            const isInvalidTitle = block.content && /^(headers|tabledata|rows)$/i.test(block.content.trim());
            return (
                 <div className="my-6">
                    {block.content && !isInvalidTitle && <h3 className="text-lg font-semibold mb-2" dangerouslySetInnerHTML={{ __html: processInlineFormatting(block.content) }} />}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-slate-100 dark:bg-gray-700/50 text-slate-600 dark:text-slate-300">
                                <tr>
                                    {block.tableData?.headers.map((header, hIndex) => (
                                        <th key={hIndex} scope="col" className="px-4 py-3 font-semibold" dangerouslySetInnerHTML={{ __html: processInlineFormatting(header) }}></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {block.tableData?.rows.map((row, rIndex) => (
                                    <tr key={rIndex} className="bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50 border-t border-slate-200 dark:border-gray-700">
                                        {row.map((cell, cIndex) => (
                                            <td key={cIndex} className="px-4 py-2" dangerouslySetInnerHTML={{ __html: processInlineFormatting(cell) }}></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        }
        default:
            return null;
    }
});

interface SummaryViewProps {
    lesson: SummaryContent[];
}
const SummaryView: React.FC<SummaryViewProps> = ({ lesson }) => {
    return (
        <div className="prose dark:prose-invert max-w-none">
            {lesson.map((block, index) => {
                const prevBlock = index > 0 ? lesson[index - 1] : null;
                const prevBlockType = prevBlock ? prevBlock.type : undefined;
                return <MemoizedContentBlock key={index} block={block} prevBlockType={prevBlockType} />
            })}
        </div>
    );
};

interface ConciseSummaryViewProps {
    summary: string;
}
const ConciseSummaryView: React.FC<ConciseSummaryViewProps> = ({ summary }) => {
    const summaryHtml = useMemo(() => markdownToHtml(summary), [summary]);
    return (
        <div className="prose dark:prose-invert max-w-none">
             <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-500" />
                    <span>Tóm tắt cốt lõi</span>
                </h3>
                <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
             </div>
        </div>
    );
};

interface QuizViewProps {
    pack: StudyPack;
}
const QuizView: React.FC<QuizViewProps> = ({ pack }) => {
    const { handleQuizAnswer, generateMoreQuestions, updateStudyPack, setTutorContextAndOpen, handleQuizComplete } = useUserStore.getState();
    const isGenerating = useUserStore(state => state.isGenerating);

    const session: QuizSession = useMemo(() => (
        pack.quizSession || {
            currentQuestionIndex: 0,
            comboCount: 0,
            submittedAnswers: {},
            incorrectlyAnsweredIds: [],
            activeQuestionIds: pack.quiz.map(q => q.uniqueId),
        }
    ), [pack.quizSession, pack.quiz]);

    const [viewMode, setViewMode] = useState<'all' | 'incorrect'>('all');
    const [showResults, setShowResults] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    
    // This effect runs whenever the active set of questions changes, which can happen
    // after generating new questions or when retrying incorrect ones. Its purpose is
    // to ensure the user is taken out of the results/review screen and back to the quiz.
    useEffect(() => {
        setShowResults(false);
        setIsReviewing(false);
    }, [session.activeQuestionIds]);
    
    const handleGenerateAndContinue = async () => {
        await generateMoreQuestions(pack.id, false);
    };

    const currentQuestion = useMemo(() => {
        const currentId = session.activeQuestionIds[session.currentQuestionIndex];
        return pack.quiz.find(q => q.uniqueId === currentId);
    }, [session.currentQuestionIndex, session.activeQuestionIds, pack.quiz]);

    const submittedAnswer = currentQuestion ? session.submittedAnswers[currentQuestion.uniqueId] : undefined;

    useEffect(() => {
        setSelectedAnswers(submittedAnswer ? submittedAnswer.selectedAnswers : []);
    }, [currentQuestion, submittedAnswer]);

    if (!currentQuestion) {
        return (
            <div className="text-center p-8 bg-slate-100 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold mb-4">Bạn đã hoàn thành tất cả các câu hỏi trong phần này!</p>
                <button 
                    onClick={handleGenerateAndContinue} 
                    disabled={isGenerating}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold flex items-center gap-2 mx-auto hover:bg-blue-700 disabled:bg-slate-400"
                >
                    {isGenerating ? 'Đang tạo...' : 'Tạo thêm câu hỏi'}
                </button>
            </div>
        );
    }
    
    const handleAnswerSelection = (option: string) => {
        if (submittedAnswer) return; // Don't allow changes after submission
        if (currentQuestion.type === 'single-choice') {
            setSelectedAnswers([option]);
        } else {
            setSelectedAnswers(prev => 
                prev.includes(option) ? prev.filter(a => a !== option) : [...prev, option]
            );
        }
    };
    
    const handleSubmit = () => {
        if (!currentQuestion || selectedAnswers.length === 0) return;
        handleQuizAnswer(pack.id, currentQuestion.uniqueId, selectedAnswers);

        const isLastQuestion = session.currentQuestionIndex === session.activeQuestionIds.length - 1;
        if (isLastQuestion) {
             const updatedSession = { ...session, submittedAnswers: { ...session.submittedAnswers, [currentQuestion.uniqueId]: { selectedAnswers, isCorrect: false } } };
             handleQuizComplete(pack, updatedSession);
             setShowResults(true);
        }
    };

    const handleNext = () => {
        if (session.currentQuestionIndex < session.activeQuestionIds.length - 1) {
            const nextIndex = session.currentQuestionIndex + 1;
            const updatedSession = { ...session, currentQuestionIndex: nextIndex };
            updateStudyPack({ ...pack, quizSession: updatedSession });
        }
    };
    
    const handleRetryIncorrect = () => {
        const incorrectIds = session.incorrectlyAnsweredIds;
        if (incorrectIds.length > 0) {
            const newSession: QuizSession = {
                currentQuestionIndex: 0,
                comboCount: 0,
                submittedAnswers: {},
                incorrectlyAnsweredIds: [],
                activeQuestionIds: incorrectIds,
            };
            updateStudyPack({ ...pack, quizSession: newSession });
            setViewMode('incorrect');
            setShowResults(false);
            setIsReviewing(false);
        }
    };

    const handleStartReview = () => {
        const newSession = { ...session, currentQuestionIndex: 0 };
        updateStudyPack({ ...pack, quizSession: newSession });
        setIsReviewing(true);
        setShowResults(false);
    };
    
    const score = Object.values(session.submittedAnswers).filter(a => a.isCorrect).length;
    const total = session.activeQuestionIds.length;
    const scorePercentage = total > 0 ? Math.round((score / total) * 100) : 0;
    
    const getOptionClass = (option: string) => {
        if (!submittedAnswer) {
            return selectedAnswers.includes(option)
                ? 'bg-blue-100 dark:bg-blue-900/50 border-brand-primary'
                : 'bg-slate-100 dark:bg-gray-700/50 hover:bg-slate-200 dark:hover:bg-gray-700 border-transparent';
        }
        
        const isCorrect = currentQuestion.correctAnswers.includes(option);
        const isSelected = selectedAnswers.includes(option);

        if (isCorrect) return 'bg-green-100 dark:bg-green-900/50 border-green-500';
        if (isSelected && !isCorrect) return 'bg-red-100 dark:bg-red-900/50 border-red-500';
        return 'bg-slate-100 dark:bg-gray-800 border-transparent opacity-70';
    };

    if (showResults) {
        return (
            <div className="p-8 text-center bg-slate-50 dark:bg-gray-800/50 rounded-lg">
                <h3 className="text-2xl font-bold mb-2">Kết quả</h3>
                <p className="text-4xl font-bold my-4">{score} / {total}</p>
                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-4 max-w-sm mx-auto">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${scorePercentage}%` }}></div>
                </div>
                <div className="mt-8 flex justify-center gap-4">
                    <button onClick={handleStartReview} className="px-4 py-2 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-gray-700">Xem lại</button>
                    {session.incorrectlyAnsweredIds.length > 0 && (
                         <button onClick={handleRetryIncorrect} className="px-4 py-2 rounded-lg font-semibold bg-amber-500 text-white hover:bg-amber-600">Làm lại câu sai</button>
                    )}
                    <button onClick={handleGenerateAndContinue} disabled={isGenerating} className="px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:bg-slate-400">
                        {isGenerating ? 'Đang tạo...' : 'Tạo thêm câu hỏi'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-1">
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Câu {session.currentQuestionIndex + 1} / {session.activeQuestionIds.length}</p>
                {session.comboCount > 1 && <div className="flex items-center gap-1 text-orange-500 font-bold animate-fade-in"><FireIcon className="w-5 h-5" /> Combo x{session.comboCount}</div>}
            </div>
            
            <div className="prose dark:prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: markdownToHtml(currentQuestion.question) }} />

            <div className="space-y-3">
                {currentQuestion.options.map((option, i) => (
                    <button 
                        key={i} 
                        onClick={() => handleAnswerSelection(option)}
                        disabled={!!submittedAnswer}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${getOptionClass(option)}`}
                    >
                       <span dangerouslySetInnerHTML={{ __html: processInlineFormatting(option) }} />
                    </button>
                ))}
            </div>
            
            {submittedAnswer && (
                <div className={`mt-6 p-4 rounded-lg animate-fade-in ${submittedAnswer.isCorrect ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    <h4 className="font-bold mb-2">{submittedAnswer.isCorrect ? 'Chính xác!' : 'Không chính xác'}</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: markdownToHtml(currentQuestion.explanation) }} />
                    <button 
                        onClick={() => setTutorContextAndOpen(currentQuestion.explanation, `Giải thích thêm về câu hỏi "${currentQuestion.question}"`)}
                        className="text-sm font-semibold text-brand-primary hover:underline mt-2">
                        Hỏi Gia sư AI để giải thích thêm
                    </button>
                </div>
            )}
            
            <div className="mt-6 text-right">
                {submittedAnswer ? (
                    <button onClick={session.currentQuestionIndex < session.activeQuestionIds.length - 1 ? handleNext : () => setShowResults(true)} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold">
                       {session.currentQuestionIndex < session.activeQuestionIds.length - 1 ? 'Tiếp theo' : 'Xem kết quả'}
                    </button>
                ) : (
                     <button onClick={handleSubmit} disabled={selectedAnswers.length === 0} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold disabled:bg-slate-400">Kiểm tra</button>
                )}
            </div>
        </div>
    );
};

interface M2StaatexamQuizViewProps {
    pack: StudyPack;
}
const M2StaatexamQuizView: React.FC<M2StaatexamQuizViewProps> = ({ pack }) => {
    // This is a simplified version; in a real app, this would be a separate component with its own logic
    // but for this fix, we'll reuse the QuizView structure and point it to the M2 data.
    const { handleM2StaatexamQuizAnswer, generateMoreQuestions, updateStudyPack, setTutorContextAndOpen, handleM2StaatexamQuizComplete } = useUserStore.getState();
    const isGenerating = useUserStore(state => state.isGenerating);

    const session: QuizSession = useMemo(() => (
        pack.m2StaatexamQuizSession || {
            currentQuestionIndex: 0,
            comboCount: 0,
            submittedAnswers: {},
            incorrectlyAnsweredIds: [],
            activeQuestionIds: (pack.m2StaatexamQuiz || []).map(q => q.uniqueId),
        }
    ), [pack.m2StaatexamQuizSession, pack.m2StaatexamQuiz]);
    
    const [showResults, setShowResults] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);

    useEffect(() => {
        setShowResults(false);
    }, [session.activeQuestionIds]);

    const handleGenerateAndContinue = async () => {
        await generateMoreQuestions(pack.id, true);
    };

    const currentQuestion = useMemo(() => {
        if (!pack.m2StaatexamQuiz) return undefined;
        const currentId = session.activeQuestionIds[session.currentQuestionIndex];
        return pack.m2StaatexamQuiz.find(q => q.uniqueId === currentId);
    }, [session.currentQuestionIndex, session.activeQuestionIds, pack.m2StaatexamQuiz]);

    const submittedAnswer = currentQuestion ? session.submittedAnswers[currentQuestion.uniqueId] : undefined;
    
    useEffect(() => {
        setSelectedAnswers(submittedAnswer ? submittedAnswer.selectedAnswers : []);
    }, [currentQuestion, submittedAnswer]);

    if (!pack.m2StaatexamQuiz || pack.m2StaatexamQuiz.length === 0) {
        return <div className="p-8 text-center bg-slate-100 dark:bg-gray-800 rounded-lg">Không có câu hỏi M2 Staatsexam nào cho gói này.</div>
    }

    if (!currentQuestion) {
        // ... same as QuizView
        return (
            <div className="text-center p-8 bg-slate-100 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold mb-4">Bạn đã hoàn thành tất cả các câu hỏi!</p>
            </div>
        );
    }
    
    // ... Handlers are very similar to QuizView, just calling the M2-specific store actions
    const handleSubmit = () => {
        if (!currentQuestion || selectedAnswers.length === 0) return;
        handleM2StaatexamQuizAnswer(pack.id, currentQuestion.uniqueId, selectedAnswers);

        const isLastQuestion = session.currentQuestionIndex === session.activeQuestionIds.length - 1;
        if (isLastQuestion) {
             const updatedSession = { ...session, submittedAnswers: { ...session.submittedAnswers, [currentQuestion.uniqueId]: { selectedAnswers, isCorrect: false } } };
             handleM2StaatexamQuizComplete(pack, updatedSession);
             setShowResults(true);
        }
    };

     // The rest of the component would be a near-copy of QuizView, adapted for M2 quiz data
    return <QuizView pack={{...pack, quiz: pack.m2StaatexamQuiz || [], quizSession: pack.m2StaatexamQuizSession}} />;
};

interface FillInTheBlankViewProps {
    pack: StudyPack;
}
const FillInTheBlankView: React.FC<FillInTheBlankViewProps> = ({ pack }) => {
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleAnswerChange = (index: number, answer: string) => {
        setUserAnswers(prev => ({ ...prev, [index]: answer }));
    };

    const renderSentence = (item: FillInTheBlank, index: number) => {
        const parts = item.sentence.split('____');
        return (
            <div key={index} className="flex flex-wrap items-center gap-2 mb-4 p-4 bg-slate-100 dark:bg-gray-800 rounded-lg">
                <span>{parts[0]}</span>
                <input
                    type="text"
                    value={userAnswers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    disabled={isSubmitted}
                    className="flex-grow p-1 border-b-2 bg-transparent focus:outline-none focus:border-brand-primary transition-colors"
                />
                <span>{parts[1]}</span>
                {isSubmitted && (
                    userAnswers[index]?.toLowerCase().trim() === item.answer.toLowerCase().trim()
                        ? <CheckCircleIcon className="w-6 h-6 text-green-500" />
                        : <div className="flex items-center gap-2"><XCircleIcon className="w-6 h-6 text-red-500" /> <span className="text-sm font-semibold text-green-600 dark:text-green-400">{item.answer}</span></div>
                )}
            </div>
        );
    };

    return (
        <div>
            {pack.fillInTheBlanks.map(renderSentence)}
            <div className="text-right mt-6">
                <button onClick={() => setIsSubmitted(true)} disabled={isSubmitted} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold disabled:bg-slate-400">
                    Kiểm tra đáp án
                </button>
            </div>
        </div>
    );
};

interface GlossaryViewProps {
    pack: StudyPack;
}
const GlossaryView: React.FC<GlossaryViewProps> = ({ pack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredGlossary = useMemo(() => 
        pack.glossary.filter(item => 
            Object.values(item).some(val => 
                typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ), 
    [pack.glossary, searchTerm]);

    return (
        <div>
            <input 
                type="text"
                placeholder="Tìm kiếm thuật ngữ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-3 mb-6 border border-slate-300 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
            <div className="space-y-4">
                {filteredGlossary.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-100 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-bold text-lg text-brand-primary">{item.vietnamese}</h4>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">EN: {item.english} / DE: {item.german}</p>
                        <p className="mt-2 text-slate-700 dark:text-slate-400">{item.definition}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface TipsViewProps {
    lesson: SummaryContent[];
}
const TipsView: React.FC<TipsViewProps> = ({ lesson }) => {
    const tips = lesson.filter(block => block.type === 'tip');
    if (tips.length === 0) {
        return <div className="p-8 text-center bg-slate-100 dark:bg-gray-800 rounded-lg">Không có mẹo nào trong bài học này.</div>
    }
    return (
        <div className="space-y-4">
            {tips.map((tip, index) => (
                <MemoizedContentBlock key={index} block={tip} />
            ))}
        </div>
    );
};

interface StudyPackViewProps {
    studyPackId: string;
    onBack: () => void;
}

export const StudyPackView: React.FC<StudyPackViewProps> = ({ studyPackId, onBack }) => {
    const pack = useUserStore(state => state.studyPacks.find(p => p.id === studyPackId));
    const recordLearningModeUsage = useUserStore(state => state.recordLearningModeUsage);
    const setTutorContextAndOpen = useUserStore(state => state.setTutorContextAndOpen);

    const [activeMode, setActiveMode] = useState<LearningMode>(LearningMode.SUMMARY);

    useEffect(() => {
        if (pack) {
            recordLearningModeUsage(pack.id, activeMode);
        }
    }, [activeMode, pack, recordLearningModeUsage]);

    if (!pack) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Không tìm thấy gói học tập.</p>
            </div>
        );
    }
    
    const packColor = PACK_COLORS.find(c => c.key === pack.color) || PACK_COLORS[0];
    const PackIcon = ICON_MAP[pack.icon || 'default'] || BookOpenIcon;
    
    const learningModes: { mode: LearningMode; name: string; icon: React.FC<{className?: string}> }[] = [
        { mode: LearningMode.SUMMARY, name: 'Bài giảng', icon: BookOpenIcon },
        { mode: LearningMode.CONCISE_SUMMARY, name: 'Tóm tắt', icon: SparklesIcon },
        { mode: LearningMode.QUIZ, name: 'Trắc nghiệm', icon: ClipboardListIcon },
        { mode: LearningMode.M2_STAATEXAM, name: 'M2 Staatsexamen', icon: StethoscopeIcon },
        { mode: LearningMode.FILL_IN_THE_BLANK, name: 'Điền vào chỗ trống', icon: PencilIcon },
        { mode: LearningMode.GLOSSARY, name: 'Thuật ngữ', icon: AcademicCapIcon },
        { mode: LearningMode.TIPS, name: 'Mẹo', icon: FireIcon },
        { mode: LearningMode.TUTOR, name: 'Hỏi Gia sư', icon: ChatAlt2Icon },
    ];

    const renderContent = () => {
        switch (activeMode) {
            case LearningMode.SUMMARY:
                return <SummaryView lesson={pack.lesson} />;
            case LearningMode.CONCISE_SUMMARY:
                return pack.conciseSummary ? <ConciseSummaryView summary={pack.conciseSummary} /> : null;
            case LearningMode.QUIZ:
                return <QuizView pack={pack} />;
            case LearningMode.M2_STAATEXAM:
                return <M2StaatexamQuizView pack={pack} />;
            case LearningMode.FILL_IN_THE_BLANK:
                return <FillInTheBlankView pack={pack} />;
            case LearningMode.GLOSSARY:
                return <GlossaryView pack={pack} />;
            case LearningMode.TIPS:
                return <TipsView lesson={pack.lesson} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="flex flex-col md:flex-row flex-grow animate-fade-in">
            <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-gray-700">
                <button onClick={onBack} className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    <span>Về trang chủ</span>
                </button>

                <div className={`p-4 rounded-lg flex items-center gap-4 mb-6 ${packColor.bg} ${packColor.text}`}>
                    <PackIcon className="w-10 h-10 flex-shrink-0" />
                    <div>
                        <h1 className="font-bold">{pack.title}</h1>
                        <p className="text-xs opacity-80">Tiến độ: {Math.round(pack.progress || 0)}%</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    {learningModes.map(({ mode, name, icon: Icon }) => {
                        const isActive = activeMode === mode;
                        const isDisabled = 
                            (mode === LearningMode.CONCISE_SUMMARY && !pack.conciseSummary) ||
                            (mode === LearningMode.QUIZ && pack.quiz.length === 0) ||
                            (mode === LearningMode.M2_STAATEXAM && (!pack.m2StaatexamQuiz || pack.m2StaatexamQuiz.length === 0)) ||
                            (mode === LearningMode.FILL_IN_THE_BLANK && pack.fillInTheBlanks.length === 0) ||
                            (mode === LearningMode.GLOSSARY && pack.glossary.length === 0);

                        return (
                            <button
                                key={mode}
                                disabled={isDisabled}
                                onClick={() => {
                                    if (mode === LearningMode.TUTOR) {
                                        setTutorContextAndOpen(pack.lesson.map(b => b.content).join('\n'), `Chào bạn, bạn muốn hỏi gì về bài "${pack.title}"?`);
                                    } else {
                                        setActiveMode(mode);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                    isActive
                                        ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                                        : 'hover:bg-slate-100 dark:hover:bg-gray-700/50'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{name}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <div className="flex-grow p-6 md:p-8 lg:p-10 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};