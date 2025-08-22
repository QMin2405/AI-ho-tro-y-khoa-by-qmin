import { QuizDifficulty, type StudyPack, type MCQ } from '../types';
import { useUIStore } from "../store/useUIStore";

// --- LOGIC MỚI: Định nghĩa URL của Backend ---
// Giữ lại URL backend của bạn để có thể deploy lên Render
const BACKEND_URL = 'https://medical-ai-backend-anja.onrender.com';

// --- TÍNH NĂNG MỚI: Dữ liệu mẫu để dự phòng ---
// Thêm lại logic mock data để ứng dụng hoạt động ngay cả khi backend lỗi.
const createMockStudyPack = async (): Promise<Partial<StudyPack>> => {
    await new Promise(res => setTimeout(res, 1500));
    const mockQuiz: MCQ[] = [
        { uniqueId: 'mock_q_1', question: "Nguyên nhân phổ biến nhất của nhồi máu cơ tim là gì?", options: ["Bóc tách động mạch chủ", "Bệnh động mạch vành", "Suy tim"], correctAnswers: ["Bệnh động mạch vành"], type: 'single-choice', explanation: "Bệnh động mạch vành dẫn đến xơ vữa động mạch, có thể gây vỡ mảng bám và huyết khối.", difficulty: QuizDifficulty.EASY },
        { uniqueId: 'mock_q_2', question: "Phát hiện nào trên điện tâm đồ là đặc trưng của nhồi máu cơ tim xuyên thành?", options: ["ST chênh xuống", "Sóng T đảo ngược", "ST chênh lên"], correctAnswers: ["ST chênh lên"], type: 'single-choice', explanation: "ST chênh lên cho thấy tổn thương toàn bộ bề dày của cơ tim.", difficulty: QuizDifficulty.MEDIUM },
    ];
    return {
        title: "Bản nháp: Tìm hiểu về Nhồi máu cơ tim",
        lesson: [
            { type: "heading", content: "🩺 Nhồi máu cơ tim là gì?" },
            { type: "paragraph", content: "Nhồi máu cơ tim (MI), thường được gọi là [HL]cơn đau tim[/HL], xảy ra khi lưu lượng máu đến một phần của tim bị chặn." },
        ],
        conciseSummary: "- **Sinh lý bệnh**: MI chủ yếu do [HL]Bệnh động mạch vành (CAD)[/HL] gây ra.\n- **Chẩn đoán**: Dựa trên triệu chứng, ==điện tâm đồ==, và tăng men tim ([HL]Troponin[/HL]).",
        quiz: mockQuiz,
        originalQuizCount: mockQuiz.length,
        fillInTheBlanks: [{ sentence: "Enzyme đặc hiệu nhất cho tổn thương cơ tim là ____.", answer: "Troponin" }],
        glossary: [{ term: "Thiếu máu cục bộ", definition: "Không đủ cung cấp máu cho một cơ quan." }]
    };
};


// --- NÂNG CẤP: Sử dụng FormData để tải tệp ---
// Thay đổi để chấp nhận đối tượng File và sử dụng FormData, là cách làm hiệu quả và tiêu chuẩn.
export const createStudyPack = async (source: { text?: string; file?: File | null }): Promise<Partial<StudyPack>> => {
    try {
        const formData = new FormData();
        if (source.text) {
            formData.append('text', source.text);
        }
        if (source.file) {
            formData.append('file', source.file);
        }

        const response = await fetch(`${BACKEND_URL}/api/create-study-pack`, {
            method: 'POST',
            body: formData, // Trình duyệt sẽ tự động đặt Content-Type là multipart/form-data
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Lỗi từ máy chủ: ${response.statusText}`);
        }

        const generatedPack = await response.json();
        
        // --- TÍNH NĂNG MỚI: Xác thực dữ liệu phía Client ---
        // Thêm một lớp bảo vệ để tránh lỗi giao diện nếu AI trả về dữ liệu không hợp lệ.
        if (generatedPack.quiz) {
            generatedPack.quiz = (generatedPack.quiz as any[]).filter(q => 
                q.question &&
                q.options && Array.isArray(q.options) && q.options.length > 0 &&
                q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0 &&
                q.correctAnswers.every((ans: string) => q.options.includes(ans))
            );
        }

        return generatedPack as Partial<StudyPack>;

    } catch (error) {
        console.error("Lỗi khi gọi backend để tạo gói học tập:", error);
        useUIStore.getState().showToast("Lỗi: Không thể tạo gói học tập. Sử dụng dữ liệu mẫu.");
        // Sử dụng dữ liệu mẫu khi có lỗi
        return createMockStudyPack();
    }
};

// Cập nhật hàm askTutor để gọi đến backend (giữ nguyên logic của bạn)
export const askTutor = async (context: string, userQuestion: string, questionContext?: string): Promise<string> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/ask-tutor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context, userQuestion, questionContext }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi không xác định từ gia sư AI.');
        }
        const data = await response.json();
        return data.answer;
    } catch (error) {
        console.error("Lỗi khi gọi backend (askTutor):", error);
        return `Lỗi: ${error.message}`;
    }
};

// --- NÂNG CẤP: Thêm hướng dẫn tùy chỉnh ---
// Thêm tham số `customInstruction` để cho phép người dùng tùy chỉnh câu hỏi được tạo ra.
export const generateMoreQuestions = async (context: string, existingQuestions: MCQ[], customInstruction?: string): Promise<Omit<MCQ, 'uniqueId'>[]> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/generate-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context, existingQuestions, customInstruction }),
        });
         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi không xác định từ máy chủ.');
        }
        const data = await response.json();
        
        const validatedQuestions = (data.questions as any[]).filter(q => 
            q.question && q.question.trim() !== '' &&
            q.explanation && q.explanation.trim() !== '' &&
            q.options && Array.isArray(q.options) && q.options.length >= 2 &&
            q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0 &&
            q.correctAnswers.every(ans => q.options.includes(ans))
        );

        return validatedQuestions;
    } catch (error) {
        console.error("Lỗi khi gọi backend (generateMoreQuestions):", error);
        useUIStore.getState().showToast(`Lỗi: ${error.message}`);
        return []; // Trả về mảng rỗng khi có lỗi
    }
};
