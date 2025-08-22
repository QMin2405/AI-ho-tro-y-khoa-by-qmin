
import { type StudyPack, type MCQ } from '../types';
import { useUIStore } from "../store/useUIStore";

// --- LOGIC MỚI: Định nghĩa URL của Backend ---
// const BACKEND_URL = 'http://localhost:3001'; // Dùng URL này khi phát triển ở máy
const BACKEND_URL = 'https://medical-ai-backend-anja.onrender.com';
const fullUrl = `${BACKEND_URL}/api/ask-tutor`;

// Hàm createStudyPack đã được cập nhật để gọi đến backend
export const createStudyPack = async (source: { text?: string; file?: { data: string, mimeType: string } }): Promise<Partial<StudyPack>> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/create-study-pack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ source }), // Gửi dữ liệu lên cho backend
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Lỗi từ máy chủ: ${response.statusText}`);
        }

        const generatedPack = await response.json();
        return generatedPack as Partial<StudyPack>;

    } catch (error) {
        console.error("Lỗi khi gọi backend để tạo gói học tập:", error);
        useUIStore.getState().showToast(`Lỗi: ${error.message}`);
        throw error;
    }
};


// Cập nhật hàm askTutor để gọi đến backend
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


// Cập nhật hàm generateMoreQuestions để gọi đến backend
export const generateMoreQuestions = async (context: string, existingQuestions: MCQ[]): Promise<Omit<MCQ, 'uniqueId'>[]> => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/generate-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context, existingQuestions }),
        });
         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Lỗi không xác định từ máy chủ.');
        }
        const data = await response.json();
        return data.questions;
    } catch (error) {
        console.error("Lỗi khi gọi backend (generateMoreQuestions):", error);
        useUIStore.getState().showToast(`Lỗi: ${error.message}`);
        return [];
    }
};