import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Types from '../types';
import { StudyPack, LearningMode, SummaryContent, QuizDifficulty, ChatMessage, QuizSession, SubmittedAnswer } from '../types';
import { useUserStore } from '../store/useUserStore';
import { XP_ACTIONS, PACK_COLORS } from '../constants';
import { processInlineFormatting, markdownToHtml } from '../utils/markdown';
import { 
    ArrowLeftIcon, BookOpenIcon, ClipboardListIcon, PencilIcon, AcademicCapIcon, FireIcon, CheckCircleIcon, XCircleIcon, ChatAlt2Icon, 
    SparklesIcon, ICON_MAP, StethoscopeIcon
} from './icons';

// Memoized component to render a single content block, preventing re-renders if the block data hasn't changed.
const MemoizedContentBlock = React.memo(({ block, prevBlockType }: { block: SummaryContent; prevBlockType?: SummaryContent['type'] }) => {
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

const SummaryView = ({ lesson }: { lesson: SummaryContent[] }) => {
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

const ConciseSummaryView = ({ summary }: { summary: string }) => {
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


const QuizView = ({ pack }: { pack: StudyPack; }) => {
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
    
    const questions = useMemo(() => {
        return pack.quiz.filter(q => session.activeQuestionIds.includes(q.uniqueId));
    }, [pack.quiz, session.activeQuestionIds]);

    const currentQuestion = questions[session.currentQuestionIndex];
    const submittedAnswer = currentQuestion ? session.submittedAnswers[currentQuestion.uniqueId] : null;

    // Memoize the formatted question and explanation to avoid re-processing on every render.
    const formattedQuestion = useMemo(() => {
        return currentQuestion ? processInlineFormatting(currentQuestion.question) : '';
    }, [currentQuestion]);

    const formattedExplanation = useMemo(() => {
        return currentQuestion ? processInlineFormatting(currentQuestion.explanation) : '';
    }, [currentQuestion]);

    useEffect(() => {
        setSelectedAnswers([]);
    }, [currentQuestion?.uniqueId]);

    const handleAnswerSubmit = (selected: string[]) => {
        if (!currentQuestion) return;
        // The store now handles ALL state updates atomically.
        handleQuizAnswer(pack.id, currentQuestion.uniqueId, selected);
        setSelectedAnswers([]);
    };

    const handleOptionClick = (option: string) => {
        if (submittedAnswer) return;
        if (currentQuestion.type === 'single-choice') {
            handleAnswerSubmit([option]);
        } else {
            setSelectedAnswers(prev => 
                prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
            );
        }
    };

    const handleMultiChoiceSubmit = () => {
        if (selectedAnswers.length > 0) handleAnswerSubmit(selectedAnswers);
    };
    
    const navigateQuestion = (direction: 'next' | 'prev') => {
        if (direction === 'next' && session.currentQuestionIndex === questions.length - 1) {
            setShowResults(true);
            setIsReviewing(false);
            handleQuizComplete(pack, session);
            return;
        }
        const newIndex = direction === 'next' 
            ? Math.min(session.currentQuestionIndex + 1, questions.length - 1)
            : Math.max(session.currentQuestionIndex - 1, 0);

        const newSession: QuizSession = { ...session, currentQuestionIndex: newIndex };
        updateStudyPack({ ...pack, quizSession: newSession });
    };
    
    const handleRetryIncorrect = () => {
        const newSession: QuizSession = {
            ...session,
            currentQuestionIndex: 0,
            submittedAnswers: {},
            activeQuestionIds: session.incorrectlyAnsweredIds,
            comboCount: 0,
        };
        updateStudyPack({ ...pack, quizSession: newSession });
        setViewMode('incorrect');
        setShowResults(false);
        setIsReviewing(false);
    };

    const handleRestartAll = () => {
        const newSession: QuizSession = {
           ...session,
            currentQuestionIndex: 0,
            comboCount: 0,
            submittedAnswers: {},
            incorrectlyAnsweredIds: [],
            activeQuestionIds: pack.quiz.map(q => q.uniqueId),
        };
        updateStudyPack({ ...pack, quizSession: newSession });
        setViewMode('all');
        setShowResults(false);
        setIsReviewing(false);
    };

    const score = Object.values(session.submittedAnswers).filter(a => a.isCorrect).length;

    if (isReviewing) {
        const reviewedQuestions = pack.quiz.filter(q => session.activeQuestionIds.includes(q.uniqueId));
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Xem lại bài làm</h2>
                    <button 
                        onClick={() => { setIsReviewing(false); setShowResults(true); }} 
                        className="px-4 py-2 bg-slate-200 dark:bg-gray-700 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600"
                    >
                        Trở về Kết quả
                    </button>
                </div>
                <div className="space-y-6">
                    {reviewedQuestions.map((question, index) => {
                        const submitted = session.submittedAnswers[question.uniqueId];
                        if (!submitted) return null;

                        const questionHtml = processInlineFormatting(question.question);
                        const explanationHtml = processInlineFormatting(question.explanation);
                        const containerBorderClass = submitted.isCorrect ? 'border-green-500' : 'border-red-500';

                        return (
                            <div key={question.uniqueId} className={`p-6 bg-slate-50 dark:bg-gray-800/50 rounded-lg border-l-4 ${containerBorderClass}`}>
                                <div className="font-semibold mb-4" dangerouslySetInnerHTML={{ __html: `${index + 1}. ${questionHtml}` }} />
                                
                                <div className="space-y-2">
                                    {question.options.map((option, optIndex) => {
                                        const isSelected = submitted.selectedAnswers.includes(option);
                                        const isCorrect = question.correctAnswers.includes(option);
                                        let optionClass = 'flex items-center gap-3 p-3 rounded-md text-sm ';

                                        if (isCorrect) {
                                            optionClass += 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 font-semibold';
                                        } else if (isSelected && !isCorrect) {
                                            optionClass += 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through';
                                        } else {
                                            optionClass += 'bg-slate-100 dark:bg-gray-700/50 text-slate-600 dark:text-slate-300';
                                        }

                                        return (
                                            <div key={optIndex} className={optionClass}>
                                                {isCorrect ? <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0"/> : (isSelected ? <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0"/> : <div className="w-5 h-5 flex-shrink-0"/>) }
                                                <span>{option}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <div className="mt-4 p-3 bg-slate-100 dark:bg-gray-700 rounded-md">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Giải thích:</p>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: explanationHtml }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (showResults) {
        return (
            <div className="text-center p-8 bg-slate-50 dark:bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">Kết quả Trắc nghiệm</h2>
                <p className="text-4xl font-bold my-4">{score} / {session.activeQuestionIds.length}</p>
                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-4 max-w-sm mx-auto">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${(score / session.activeQuestionIds.length) * 100}%` }}></div>
                </div>
                <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
                    {session.incorrectlyAnsweredIds.length > 0 && (
                        <button onClick={handleRetryIncorrect} className="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors">Ôn tập lại câu sai</button>
                    )}
                    <button onClick={handleRestartAll} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Làm lại từ đầu</button>
                     {Object.keys(session.submittedAnswers).length > 0 && (
                        <button onClick={() => { setIsReviewing(true); setShowResults(false); }} className="px-6 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">Xem lại bài làm</button>
                    )}
                    <button onClick={handleGenerateAndContinue} disabled={isGenerating} className="px-5 py-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold disabled:opacity-60 disabled:bg-slate-400">
                         {isGenerating ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang tạo...</span></>
                        ) : (
                            <><SparklesIcon className="w-5 h-5"/><span>Tạo thêm 5 câu hỏi</span></>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    if (!currentQuestion && questions.length > 0) {
        setShowResults(true);
        return null;
    }
    
    if (questions.length === 0) {
        return <p>Không có câu hỏi nào để hiển thị.</p>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Câu hỏi {session.currentQuestionIndex + 1} / {questions.length}</p>
                {session.comboCount > 1 && <div className="flex items-center gap-1 font-bold text-orange-500 animate-fade-in"><FireIcon/> x{session.comboCount} COMBO!</div>}
            </div>
            <p className="text-lg font-semibold mb-6">
                 <span dangerouslySetInnerHTML={{ __html: formattedQuestion }} />
                 {currentQuestion.type === 'multiple-choice' && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">(Chọn nhiều đáp án)</span>}
            </p>
            <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = submittedAnswer ? submittedAnswer.selectedAnswers.includes(option) : selectedAnswers.includes(option);
                    const isCorrectAnswer = currentQuestion.correctAnswers.includes(option);
                    let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-colors flex items-center justify-between ';
                    
                    if (submittedAnswer) {
                        if (isCorrectAnswer) buttonClass += 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200';
                        else if (isSelected && !isCorrectAnswer) buttonClass += 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200';
                        else buttonClass += 'bg-slate-100 dark:bg-gray-700 border-transparent';
                    } else {
                         buttonClass += isSelected 
                            ? 'bg-blue-100 dark:bg-blue-900/50 border-brand-primary'
                            : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 hover:border-brand-primary dark:hover:border-brand-secondary';
                    }
                    return (
                        <button key={index} onClick={() => handleOptionClick(option)} disabled={!!submittedAnswer} className={buttonClass}>
                            <span><span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span> {option}</span>
                             {submittedAnswer && isCorrectAnswer && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                             {submittedAnswer && isSelected && !isCorrectAnswer && <XCircleIcon className="w-5 h-5 text-red-600" />}
                        </button>
                    )
                })}
            </div>
             {currentQuestion.type === 'multiple-choice' && !submittedAnswer && (
                <div className="mt-6 text-right">
                    <button onClick={handleMultiChoiceSubmit} disabled={selectedAnswers.length === 0} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">Kiểm tra</button>
                </div>
            )}
            {submittedAnswer && (
                 <div className={`mt-6 p-4 rounded-lg ${submittedAnswer.isCorrect ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    <div className="flex items-start gap-2">
                         {submittedAnswer.isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" /> : <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />}
                        <div>
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-lg">{submittedAnswer.isCorrect ? "Chính xác!" : "Không chính xác"}</h4>
                                <button onClick={() => { const context = `Câu hỏi: ${currentQuestion.question}\nLựa chọn: ${currentQuestion.options.join(', ')}\nGiải thích: ${currentQuestion.explanation}`; setTutorContextAndOpen(context, 'Chào bạn! Bạn muốn hỏi gì về câu hỏi này?'); }} className="px-3 py-1 text-xs rounded-full bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 font-semibold flex items-center gap-1.5">
                                     <ChatAlt2Icon className="w-4 h-4" /> Hỏi Gia sư
                                </button>
                            </div>
                            <p className="text-sm mt-1" dangerouslySetInnerHTML={{__html: formattedExplanation}}></p>
                        </div>
                    </div>
                 </div>
            )}
            <div className="flex justify-between mt-8">
                 <button onClick={() => navigateQuestion('prev')} disabled={session.currentQuestionIndex === 0} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 disabled:opacity-50">Trước</button>
                 <button onClick={() => navigateQuestion('next')} disabled={!submittedAnswer} className="px-6 py-2 rounded-lg bg-brand-primary text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                     {session.currentQuestionIndex === questions.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                </button>
            </div>
            <div className="mt-12 pt-6 border-t border-slate-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-2">Thêm câu hỏi?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Sử dụng AI để tạo thêm các câu hỏi trắc nghiệm dựa trên nội dung bài học.</p>
                <button onClick={() => generateMoreQuestions(pack.id, false)} disabled={isGenerating} className="px-5 py-2 flex items-center gap-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 font-semibold disabled:opacity-60">
                     {isGenerating ? (
                        <><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div><span>Đang tạo...</span></>
                    ) : (
                        <><SparklesIcon className="w-5 h-5"/><span>Tạo thêm 5 câu hỏi</span></>
                     )}
                </button>
            </div>
        </div>
    );
};

const M2StaatexamQuizView = ({ pack }: { pack: StudyPack; }) => {
    const { handleM2StaatexamQuizAnswer, generateMoreQuestions, updateStudyPack, setTutorContextAndOpen, handleM2StaatexamQuizComplete } = useUserStore.getState();
    const isGenerating = useUserStore(state => state.isGenerating);
    
    const questions = pack.m2StaatexamQuiz || [];

    const session: QuizSession = useMemo(() => (
        pack.m2StaatexamQuizSession || {
            currentQuestionIndex: 0,
            comboCount: 0,
            submittedAnswers: {},
            incorrectlyAnsweredIds: [],
            activeQuestionIds: questions.map(q => q.uniqueId),
        }
    ), [pack.m2StaatexamQuizSession, questions]);

    const [viewMode, setViewMode] = useState<'all' | 'incorrect'>('all');
    const [showResults, setShowResults] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    
    useEffect(() => {
        setShowResults(false);
        setIsReviewing(false);
    }, [session.activeQuestionIds]);
    
    const handleGenerateAndContinue = async () => {
        await generateMoreQuestions(pack.id, true);
    };
    
    const activeQuestions = useMemo(() => {
        return questions.filter(q => session.activeQuestionIds.includes(q.uniqueId));
    }, [questions, session.activeQuestionIds]);

    const currentQuestion = activeQuestions[session.currentQuestionIndex];
    const submittedAnswer = currentQuestion ? session.submittedAnswers[currentQuestion.uniqueId] : null;

    const formattedQuestion = useMemo(() => {
        return currentQuestion ? processInlineFormatting(currentQuestion.question) : '';
    }, [currentQuestion]);

    const formattedExplanation = useMemo(() => {
        return currentQuestion ? processInlineFormatting(currentQuestion.explanation) : '';
    }, [currentQuestion]);

    useEffect(() => {
        setSelectedAnswers([]);
    }, [currentQuestion?.uniqueId]);

    const handleAnswerSubmit = (selected: string[]) => {
        if (!currentQuestion) return;
        handleM2StaatexamQuizAnswer(pack.id, currentQuestion.uniqueId, selected);
        setSelectedAnswers([]);
    };

    const handleOptionClick = (option: string) => {
        if (submittedAnswer) return;
        if (currentQuestion.type === 'single-choice') {
            handleAnswerSubmit([option]);
        } else {
            setSelectedAnswers(prev => 
                prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
            );
        }
    };

    const handleMultiChoiceSubmit = () => {
        if (selectedAnswers.length > 0) handleAnswerSubmit(selectedAnswers);
    };
    
    const navigateQuestion = (direction: 'next' | 'prev') => {
        if (direction === 'next' && session.currentQuestionIndex === activeQuestions.length - 1) {
            setShowResults(true);
            setIsReviewing(false);
            handleM2StaatexamQuizComplete(pack, session);
            return;
        }
        const newIndex = direction === 'next' 
            ? Math.min(session.currentQuestionIndex + 1, activeQuestions.length - 1)
            : Math.max(session.currentQuestionIndex - 1, 0);

        const newSession: QuizSession = { ...session, currentQuestionIndex: newIndex };
        updateStudyPack({ ...pack, m2StaatexamQuizSession: newSession });
    };
    
    const handleRetryIncorrect = () => {
        const newSession: QuizSession = {
            ...session,
            currentQuestionIndex: 0,
            submittedAnswers: {},
            activeQuestionIds: session.incorrectlyAnsweredIds,
            comboCount: 0,
        };
        updateStudyPack({ ...pack, m2StaatexamQuizSession: newSession });
        setViewMode('incorrect');
        setShowResults(false);
        setIsReviewing(false);
    };

    const handleRestartAll = () => {
        const newSession: QuizSession = {
           ...session,
            currentQuestionIndex: 0,
            comboCount: 0,
            submittedAnswers: {},
            incorrectlyAnsweredIds: [],
            activeQuestionIds: questions.map(q => q.uniqueId),
        };
        updateStudyPack({ ...pack, m2StaatexamQuizSession: newSession });
        setViewMode('all');
        setShowResults(false);
        setIsReviewing(false);
    };

    const score = Object.values(session.submittedAnswers).filter(a => a.isCorrect).length;

    if (isReviewing) {
        const reviewedQuestions = questions.filter(q => session.activeQuestionIds.includes(q.uniqueId));
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Xem lại bài làm</h2>
                    <button 
                        onClick={() => { setIsReviewing(false); setShowResults(true); }} 
                        className="px-4 py-2 bg-slate-200 dark:bg-gray-700 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600"
                    >
                        Trở về Kết quả
                    </button>
                </div>
                <div className="space-y-6">
                    {reviewedQuestions.map((question, index) => {
                        const submitted = session.submittedAnswers[question.uniqueId];
                        if (!submitted) return null;
                        const questionHtml = processInlineFormatting(question.question);
                        const explanationHtml = processInlineFormatting(question.explanation);
                        const containerBorderClass = submitted.isCorrect ? 'border-green-500' : 'border-red-500';
                        return (
                            <div key={question.uniqueId} className={`p-6 bg-slate-50 dark:bg-gray-800/50 rounded-lg border-l-4 ${containerBorderClass}`}>
                                <div className="font-semibold mb-4 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: `${index + 1}. ${questionHtml}` }} />
                                <div className="space-y-2">
                                    {question.options.map((option, optIndex) => {
                                        const isSelected = submitted.selectedAnswers.includes(option);
                                        const isCorrect = question.correctAnswers.includes(option);
                                        let optionClass = 'flex items-center gap-3 p-3 rounded-md text-sm ';
                                        if (isCorrect) optionClass += 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 font-semibold';
                                        else if (isSelected && !isCorrect) optionClass += 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through';
                                        else optionClass += 'bg-slate-100 dark:bg-gray-700/50 text-slate-600 dark:text-slate-300';
                                        return (
                                            <div key={optIndex} className={optionClass}>
                                                {isCorrect ? <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0"/> : (isSelected ? <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0"/> : <div className="w-5 h-5 flex-shrink-0"/>) }
                                                <span>{option}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-3 bg-slate-100 dark:bg-gray-700 rounded-md">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Giải thích:</p>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: explanationHtml }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (showResults) {
        return (
            <div className="text-center p-8 bg-slate-50 dark:bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">Kết quả Trắc nghiệm M2 staatexam</h2>
                <p className="text-4xl font-bold my-4">{score} / {session.activeQuestionIds.length}</p>
                <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-4 max-w-sm mx-auto">
                    <div className="bg-green-500 h-4 rounded-full" style={{ width: `${(score / session.activeQuestionIds.length) * 100}%` }}></div>
                </div>
                <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
                    {session.incorrectlyAnsweredIds.length > 0 && (
                        <button onClick={handleRetryIncorrect} className="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors">Ôn tập lại câu sai</button>
                    )}
                    <button onClick={handleRestartAll} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Làm lại từ đầu</button>
                     {Object.keys(session.submittedAnswers).length > 0 && (
                        <button onClick={() => { setIsReviewing(true); setShowResults(false); }} className="px-6 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">Xem lại bài làm</button>
                    )}
                    <button onClick={handleGenerateAndContinue} disabled={isGenerating} className="px-5 py-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold disabled:opacity-60 disabled:bg-slate-400">
                         {isGenerating ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang tạo...</span></>
                        ) : (
                            <><SparklesIcon className="w-5 h-5"/><span>Tạo thêm 5 câu hỏi</span></>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    if (!currentQuestion && activeQuestions.length > 0) {
        setShowResults(true);
        return null;
    }
    
    if (activeQuestions.length === 0) {
        return <p>Không có câu hỏi nào để hiển thị.</p>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Câu hỏi {session.currentQuestionIndex + 1} / {activeQuestions.length}</p>
                {session.comboCount > 1 && <div className="flex items-center gap-1 font-bold text-orange-500 animate-fade-in"><FireIcon/> x{session.comboCount} COMBO!</div>}
            </div>
            <div className="text-lg font-semibold mb-6 prose prose-base dark:prose-invert max-w-none">
                 <div dangerouslySetInnerHTML={{ __html: formattedQuestion }} />
                 {currentQuestion.type === 'multiple-choice' && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">(Chọn nhiều đáp án)</span>}
            </div>
            <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = submittedAnswer ? submittedAnswer.selectedAnswers.includes(option) : selectedAnswers.includes(option);
                    const isCorrectAnswer = currentQuestion.correctAnswers.includes(option);
                    let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-colors flex items-center justify-between ';
                    if (submittedAnswer) {
                        if (isCorrectAnswer) buttonClass += 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200';
                        else if (isSelected && !isCorrectAnswer) buttonClass += 'bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200';
                        else buttonClass += 'bg-slate-100 dark:bg-gray-700 border-transparent';
                    } else {
                         buttonClass += isSelected ? 'bg-blue-100 dark:bg-blue-900/50 border-brand-primary' : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 hover:border-brand-primary dark:hover:border-brand-secondary';
                    }
                    return (
                        <button key={index} onClick={() => handleOptionClick(option)} disabled={!!submittedAnswer} className={buttonClass}>
                            <span><span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span> {option}</span>
                             {submittedAnswer && isCorrectAnswer && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
                             {submittedAnswer && isSelected && !isCorrectAnswer && <XCircleIcon className="w-5 h-5 text-red-600" />}
                        </button>
                    )
                })}
            </div>
             {currentQuestion.type === 'multiple-choice' && !submittedAnswer && (
                <div className="mt-6 text-right">
                    <button onClick={handleMultiChoiceSubmit} disabled={selectedAnswers.length === 0} className="px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">Kiểm tra</button>
                </div>
            )}
            {submittedAnswer && (
                 <div className={`mt-6 p-4 rounded-lg ${submittedAnswer.isCorrect ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                    <div className="flex items-start gap-2">
                         {submittedAnswer.isCorrect ? <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" /> : <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />}
                        <div>
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-lg">{submittedAnswer.isCorrect ? "Chính xác!" : "Không chính xác"}</h4>
                                <button onClick={() => { const context = `Câu hỏi: ${currentQuestion.question}\nLựa chọn: ${currentQuestion.options.join(', ')}\nGiải thích: ${currentQuestion.explanation}`; setTutorContextAndOpen(context, 'Chào bạn! Bạn muốn hỏi gì về câu hỏi này?'); }} className="px-3 py-1 text-xs rounded-full bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 font-semibold flex items-center gap-1.5">
                                     <ChatAlt2Icon className="w-4 h-4" /> Hỏi Gia sư
                                </button>
                            </div>
                            <p className="text-sm mt-1 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html: formattedExplanation}}></p>
                        </div>
                    </div>
                 </div>
            )}
            <div className="flex justify-between mt-8">
                 <button onClick={() => navigateQuestion('prev')} disabled={session.currentQuestionIndex === 0} className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 disabled:opacity-50">Trước</button>
                 <button onClick={() => navigateQuestion('next')} disabled={!submittedAnswer} className="px-6 py-2 rounded-lg bg-brand-primary text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                     {session.currentQuestionIndex === activeQuestions.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                </button>
            </div>
            <div className="mt-12 pt-6 border-t border-slate-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-2">Thêm câu hỏi?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Sử dụng AI để tạo thêm các câu hỏi trắc nghiệm theo phong cách M2 staatexam dựa trên nội dung bài học.</p>
                <button onClick={() => generateMoreQuestions(pack.id, true)} disabled={isGenerating} className="px-5 py-2 flex items-center gap-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 font-semibold disabled:opacity-60">
                     {isGenerating ? (
                        <><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div><span>Đang tạo...</span></>
                    ) : (
                        <><SparklesIcon className="w-5 h-5"/><span>Tạo thêm 5 câu hỏi</span></>
                     )}
                </button>
            </div>
        </div>
    );
};

const FillInTheBlanksView = ({ items }: { items: Types.FillInTheBlank[] }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const handleInputChange = (index: number, value: string) => {
        setAnswers(prev => ({ ...prev, [index]: value }));
        setSubmitted(false);
    };
    return (
        <div className="space-y-6">
            {items.map((item, index) => {
                const userAnswer = answers[index] || '';
                const isCorrect = submitted && userAnswer.trim().toLowerCase() === item.answer.toLowerCase();
                const sentenceParts = item.sentence.split('____');
                return (
                    <div key={index}>
                        <div className="flex items-center flex-wrap gap-2 text-lg">
                            <span>{sentenceParts[0]}</span>
                            <input type="text" value={userAnswer} onChange={e => handleInputChange(index, e.target.value)} className={`inline-block w-48 p-1 border-b-2 bg-transparent focus:outline-none ${ submitted ? (isCorrect ? 'border-green-500' : 'border-red-500') : 'border-slate-400 focus:border-brand-primary' }`} />
                            <span>{sentenceParts[1]}</span>
                        </div>
                        {submitted && !isCorrect && <p className="text-sm text-green-600 dark:text-green-400 mt-1">Đáp án đúng: <span className="font-semibold">{item.answer}</span></p>}
                    </div>
                );
            })}
             <button onClick={() => setSubmitted(true)} className="mt-6 px-6 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:bg-blue-700">Kiểm tra Đáp án</button>
        </div>
    );
};

const GlossaryView = ({ items }: { items: Types.GlossaryItem[] }) => {
    return (
        <dl className="space-y-4">
            {items.map((item, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-lg">
                    <dt>
                        <p className="font-bold text-lg text-brand-primary dark:text-brand-secondary">{item.english}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-semibold">DE:</span> {item.german} &bull; <span className="font-semibold">VI:</span> {item.vietnamese}
                        </p>
                    </dt>
                    <dd className="mt-2 text-slate-600 dark:text-slate-300">{item.definition}</dd>
                </div>
            ))}
        </dl>
    );
};

interface HeaderData {
    exists: boolean;
    title: string;
    imageUrl: string;
    color?: string;
    icon?: string;
}

interface ContentData {
    lesson: Types.SummaryContent[] | undefined;
    conciseSummary: string | undefined;
    packForQuiz: Types.StudyPack | undefined;
    fillInTheBlanks: Types.FillInTheBlank[] | undefined;
    glossary: Types.GlossaryItem[] | undefined;
}

interface StudyPackViewProps {
    studyPackId: string;
    onBack: () => void;
}

export const StudyPackView: React.FC<StudyPackViewProps> = ({ studyPackId, onBack }) => {
    const { recordLearningModeUsage } = useUserStore.getState();
    const [mode, setMode] = useState<LearningMode>(LearningMode.SUMMARY);

    // Select the entire pack object. The subscription will be to this object.
    const studyPack = useUserStore(state => state.studyPacks.find(p => p.id === studyPackId));

    const menuItems = useMemo(() => [
        { id: LearningMode.SUMMARY, name: 'Bài giảng', icon: BookOpenIcon, isVisible: !!studyPack?.lesson?.length },
        { id: LearningMode.CONCISE_SUMMARY, name: 'Tóm tắt', icon: SparklesIcon, isVisible: !!studyPack?.conciseSummary },
        { id: LearningMode.QUIZ, name: 'Trắc nghiệm', icon: ClipboardListIcon, isVisible: !!studyPack?.quiz?.length },
        { id: LearningMode.M2_STAATEXAM, name: 'Trắc nghiệm M2 staatexam', icon: StethoscopeIcon, isVisible: !!studyPack?.m2StaatexamQuiz?.length },
        { id: LearningMode.FILL_IN_THE_BLANK, name: 'Điền vào chỗ trống', icon: PencilIcon, isVisible: !!studyPack?.fillInTheBlanks?.length },
        { id: LearningMode.GLOSSARY, name: 'Thuật ngữ', icon: AcademicCapIcon, isVisible: !!studyPack?.glossary?.length },
    ].filter(item => item.isVisible), [studyPack]);

    // Derive header and content data using useMemo to prevent re-renders of children
    // if parts of the pack they don't depend on change (like quizSession).
    const headerData: HeaderData = useMemo(() => {
        return {
            exists: !!studyPack,
            title: studyPack?.title ?? '',
            imageUrl: studyPack?.imageUrl ?? '📚',
            color: studyPack?.color,
            icon: studyPack?.icon,
        };
    }, [studyPack]);

    const contentData: ContentData = useMemo(() => {
        return {
            lesson: studyPack?.lesson,
            conciseSummary: studyPack?.conciseSummary,
            packForQuiz: studyPack, // QuizView needs the whole pack
            fillInTheBlanks: studyPack?.fillInTheBlanks,
            glossary: studyPack?.glossary,
        };
    }, [studyPack]);


    // If the pack somehow doesn't exist (e.g., deleted in another tab), go back.
    useEffect(() => {
        if (!headerData.exists) {
            onBack();
        }
    }, [headerData.exists, onBack]);

    // Effect to record learning mode usage
    useEffect(() => {
        recordLearningModeUsage(studyPackId, mode);
    }, [studyPackId, mode, recordLearningModeUsage]);

    if (!headerData.exists || !contentData || !studyPack) {
        return null;
    }

    const packColor = PACK_COLORS.find(c => c.key === headerData.color) || PACK_COLORS[0];
    const PackIcon = ICON_MAP[headerData.icon || ''];
    
    const renderContent = () => {
        switch(mode) {
            case LearningMode.SUMMARY:
                return contentData.lesson ? <SummaryView lesson={contentData.lesson} /> : null;
            case LearningMode.CONCISE_SUMMARY:
                return contentData.conciseSummary ? <ConciseSummaryView summary={contentData.conciseSummary} /> : null;
            case LearningMode.QUIZ:
                 return contentData.packForQuiz ? <QuizView pack={contentData.packForQuiz} /> : null;
            case LearningMode.M2_STAATEXAM:
                 return contentData.packForQuiz ? <M2StaatexamQuizView pack={contentData.packForQuiz} /> : null;
            case LearningMode.FILL_IN_THE_BLANK:
                return contentData.fillInTheBlanks ? <FillInTheBlanksView items={contentData.fillInTheBlanks} /> : null;
            case LearningMode.GLOSSARY:
                return contentData.glossary ? <GlossaryView items={contentData.glossary} /> : null;
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto p-6 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-primary mb-4">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Trở về Trang chủ</span>
            </button>
            <div className={`p-6 rounded-xl mb-8 ${packColor.bg} ${packColor.text}`}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4 group">
                         <h1 className="text-3xl font-bold flex items-center gap-3">
                            {PackIcon ? <PackIcon className="w-8 h-8"/> : <span>{headerData.imageUrl}</span>}
                            {headerData.title}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="flex gap-8">
                <aside className="w-1/4 self-start sticky top-24">
                    <nav className="space-y-2">
                        {menuItems.map(item => (
                            <button key={item.id} onClick={() => setMode(item.id as LearningMode)} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left font-semibold transition-colors ${mode === item.id ? 'bg-brand-primary text-white' : 'hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                                <item.icon className="w-6 h-6" />
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="w-3/4 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                   {renderContent()}
                </main>
            </div>
        </div>
    );
};