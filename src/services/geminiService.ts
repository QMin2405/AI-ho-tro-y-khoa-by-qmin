import { GoogleGenAI, Type } from "@google/genai";
import { QuizDifficulty, type StudyPack, type MCQ } from '../types';
import { useUIStore } from "../store/useUIStore";

// Vite exposes env variables via import.meta.env
const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.warn("API_KEY environment variable not set. Using a mock service.");
}

const ai = new GoogleGenAI({ apiKey: apiKey! });

const studyPackSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Một tiêu đề ngắn gọn, hấp dẫn cho gói học tập dựa trên văn bản." },
        lesson: {
            type: Type.ARRAY,
            description: "Một bài giảng có cấu trúc, toàn diện được tạo ra từ văn bản gốc, được làm giàu bằng các giải thích chuyên sâu. Bài giảng này được chia thành các khối nội dung logic để dễ học.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['heading', 'paragraph', 'tip', 'warning', 'example', 'table'], description: "Loại khối nội dung." },
                    content: { type: Type.STRING, description: "Nội dung văn bản. Đối với bảng, đây là tiêu đề của bảng. Tuân thủ các quy tắc định dạng được chỉ định trong prompt." },
                    tableData: {
                        type: Type.OBJECT,
                        description: "Dữ liệu cho bảng, chỉ sử dụng khi type là 'table'.",
                        properties: {
                            headers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Mảng các chuỗi cho tiêu đề cột." },
                            rows: { 
                                type: Type.ARRAY, 
                                description: "Mảng các hàng, trong đó mỗi hàng là một mảng các chuỗi.",
                                items: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING } 
                                } 
                            }
                        },
                        required: ["headers", "rows"]
                    }
                },
                required: ["type", "content"]
            }
        },
        conciseSummary: {
            type: Type.STRING,
            description: "Một bản tóm tắt cực kỳ cô đọng (3-5 gạch đầu dòng), chỉ tập trung vào các điểm chính về Sinh lý bệnh, Chẩn đoán và Điều trị từ bài giảng. Bản tóm tắt này phải tuân thủ các quy tắc định dạng văn bản đã chỉ định (in đậm, highlight, v.v.) và mỗi mục phải bắt đầu bằng '- '."
        },
        quiz: {
            type: Type.ARRAY,
            description: "Tạo 8-12 câu hỏi trắc nghiệm với độ khó khác nhau, bao gồm cả tình huống lâm sàng, câu hỏi một lựa chọn và nhiều lựa chọn.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Một mảng chứa (các) câu trả lời đúng." },
                    type: { type: Type.STRING, enum: ['single-choice', 'multiple-choice'], description: "Loại câu hỏi trắc nghiệm."},
                    explanation: { type: Type.STRING, description: "Một lời giải thích ngắn gọn cho câu trả lời đúng." },
                    difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
                },
                required: ["question", "options", "correctAnswers", "type", "explanation", "difficulty"]
            }
        },
        fillInTheBlanks: {
            type: Type.ARRAY,
            description: "Tạo 5-7 câu hỏi điền vào chỗ trống tập trung vào các thuật ngữ chính. Sử dụng '____' làm chỗ trống.",
            items: {
                type: Type.OBJECT,
                properties: {
                    sentence: { type: Type.STRING },
                    answer: { type: Type.STRING }
                },
                required: ["sentence", "answer"]
            }
        },
        glossary: {
            type: Type.ARRAY,
            description: "Một danh sách các thuật ngữ quan trọng và định nghĩa của chúng từ văn bản.",
            items: {
                type: Type.OBJECT,
                properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                },
                required: ["term", "definition"]
            }
        }
    },
    required: ["title", "lesson", "conciseSummary", "quiz", "fillInTheBlanks", "glossary"]
};

const createMockStudyPack = async (): Promise<Partial<StudyPack>> => {
    await new Promise(res => setTimeout(res, 1500));
    const mockQuiz: MCQ[] = [
        { uniqueId: 'mock_q_1', question: "Nguyên nhân phổ biến nhất của nhồi máu cơ tim là gì?", options: ["Bóc tách động mạch chủ", "Bệnh động mạch vành", "Suy tim"], correctAnswers: ["Bệnh động mạch vành"], type: 'single-choice', explanation: "Bệnh động mạch vành dẫn đến xơ vữa động mạch, có thể gây vỡ mảng bám và huyết khối.", difficulty: QuizDifficulty.EASY },
        { uniqueId: 'mock_q_2', question: "Phát hiện nào trên điện tâm đồ là đặc trưng của nhồi máu cơ tim xuyên thành?", options: ["ST chênh xuống", "Sóng T đảo ngược", "ST chênh lên"], correctAnswers: ["ST chênh lên"], type: 'single-choice', explanation: "ST chênh lên cho thấy tổn thương toàn bộ bề dày của cơ tim.", difficulty: QuizDifficulty.MEDIUM },
        { uniqueId: 'mock_q_3', question: "Các yếu tố nguy cơ chính của bệnh động mạch vành bao gồm (chọn tất cả các đáp án đúng):", options: ["Hút thuốc lá", "Tăng huyết áp", "Đái tháo đường", "Uống nhiều nước"], correctAnswers: ["Hút thuốc lá", "Tăng huyết áp", "Đái tháo đường"], type: 'multiple-choice', explanation: "Hút thuốc, tăng huyết áp và đái tháo đường đều là những yếu tố nguy cơ chính đã được chứng minh cho bệnh động mạch vành. Uống nhiều nước không phải là một yếu tố nguy cơ.", difficulty: QuizDifficulty.MEDIUM }
    ];
    return {
        title: "Bản nháp: Tìm hiểu về Nhồi máu cơ tim",
        lesson: [
            { type: "heading", content: "🩺 Nhồi máu cơ tim là gì?" },
            { type: "paragraph", content: "Nhồi máu cơ tim (MI), thường được gọi là [HL]cơn đau tim[/HL], xảy ra khi lưu lượng máu đến một phần của tim bị chặn trong một thời gian đủ dài khiến một phần cơ tim bị tổn thương hoặc chết. Nguyên nhân chính là [DEF term=\"Bệnh động mạch vành (CAD)\"]Tình trạng các mảng bám xơ vữa tích tụ bên trong động mạch vành, làm hẹp lòng mạch và giảm lưu lượng máu đến nuôi cơ tim.[/DEF]." },
            { type: "tip", content: "Ghi nhớ từ viết tắt **MONA** để điều trị ban đầu: __Morphine__, __Oxygen__, __Nitroglycerin__, __Aspirin__." },
            { type: "warning", content: "Không dùng nitroglycerin nếu bệnh nhân đã dùng thuốc ức chế phosphodiesterase (ví dụ: *sildenafil*) trong vòng 24-48 giờ do nguy cơ ==hạ huyết áp nghiêm trọng==." },
            { 
                type: "table", 
                content: "Phân loại theo Killip trong Suy tim cấp sau NMCT",
                tableData: {
                    headers: ["Phân độ", "Mô tả lâm sàng", "Tỷ lệ tử vong"],
                    rows: [
                        ["I", "Không có ran ở phổi, không có tiếng T3.", "6%"],
                        ["II", "Ran ở đáy phổi (≤ 50% phế trường), có thể có tiếng T3.", "17%"],
                        ["III", "Phù phổi cấp (ran > 50% phế trường).", "38%"],
                        ["IV", "Sốc tim (Huyết áp tâm thu < 90 mmHg, dấu hiệu giảm tưới máu).", "67%"]
                    ]
                }
            },
            { type: "example", content: "Một nam bệnh nhân 65 tuổi có biểu hiện đau thắt ngực sau xương ức lan ra cánh tay trái, vã mồ hôi và khó thở. Điện tâm đồ cho thấy đoạn ST chênh lên ở các chuyển đạo II, III và aVF, cho thấy một cơn nhồi máu cơ tim thành dưới." }
        ],
        conciseSummary: "- **Sinh lý bệnh**: MI chủ yếu do [HL]Bệnh động mạch vành (CAD)[/HL] gây ra, dẫn đến thiếu máu cục bộ cơ tim.\n- **Chẩn đoán**: Dựa trên triệu chứng đau ngực, thay đổi trên ==điện tâm đồ (ST chênh lên)==, và tăng men tim ([HL]Troponin[/HL]).\n- **Điều trị**: Cấp cứu bao gồm MONA và tái tưới máu khẩn cấp bằng [DEF term=\"PCI\"]Can thiệp mạch vành qua da.[/DEF] hoặc thuốc tiêu sợi huyết.",
        quiz: mockQuiz,
        originalQuizCount: mockQuiz.length,
        fillInTheBlanks: [{ sentence: "Enzyme đặc hiệu nhất cho tổn thương cơ tim là ____.", answer: "Troponin" }],
        glossary: [{ term: "Thiếu máu cục bộ", definition: "Không đủ nguồn cung cấp máu cho một cơ quan hoặc một bộ phận của cơ thể, đặc biệt là cơ tim." }]
    };
};

export const createStudyPack = async (source: { text?: string; file?: { data: string, mimeType: string } }): Promise<Partial<StudyPack>> => {
    if (!apiKey) {
        return createMockStudyPack();
    }
    
    try {
        let contents;
        const basePrompt = `Bạn là một chuyên gia biên soạn giáo trình y khoa, chuyên tạo ra các câu hỏi ôn tập chất lượng cao theo phong cách AMBOSS. Nhiệm vụ của bạn là chuyển đổi tài liệu y khoa do người dùng cung cấp thành một Gói học tập toàn diện bằng tiếng Việt, tập trung vào kiến thức "high-yield" và khả năng áp dụng lâm sàng. Hãy tuân thủ nghiêm ngặt các quy tắc sau:

1.  **Phân Tích & Tổng Hợp Bài Giảng:**
    *   Xác định chủ đề chính và các khái niệm cốt lõi.
    *   Tái cấu trúc thông tin thành một bài giảng có logic, dễ hiểu. Sử dụng tiêu đề, đoạn văn, bảng biểu, mẹo, cảnh báo và ví dụ.
    *   **Tạo Bảng Tự Động:** Nếu nội dung mô tả sự so sánh (ví dụ: so sánh hai hội chứng) hoặc một hệ thống phân loại phức tạp, BẮT BUỘC phải chuyển nó thành dạng bảng (\`type: 'table'\`) để dễ so sánh.
    *   **Định Dạng Nội Dung Văn Bản:** Sử dụng các thẻ sau để định dạng văn bản trong TẤT CẢ các loại nội dung (đoạn văn, mẹo, cảnh báo, ô bảng, v.v.):
        *   **In đậm:** \`**văn bản**\`. Dùng cho các thuật ngữ rất quan trọng hoặc các tiêu đề phụ trong một khối văn bản.
        *   **In nghiêng:** \`*văn bản*\`. Dùng để nhấn mạnh hoặc cho các thuật ngữ tiếng nước ngoài.
        *   **Gạch chân:** \`__văn bản__\`. Sử dụng một cách tiết kiệm cho sự nhấn mạnh đặc biệt.
        *   **Highlight:** \`==văn bản==\`. Dùng để làm nổi bật thông tin "high-yield", các giá trị quan trọng, hoặc các điểm cần ghi nhớ.
        *   **Thuật ngữ y khoa (Màu xanh):** \`[HL]văn bản[/HL]\`. Dành riêng cho các thuật ngữ y khoa chính.
        *   **Giải thích thuật ngữ (Tooltip):** \`[DEF term="Thuật ngữ"]Nội dung giải thích.[/DEF]\`.
    *   **Định Dạng Cấu Trúc:**
        *   **Tiêu đề (heading):** LUÔN LUÔN bắt đầu bằng một biểu tượng cảm xúc (emoji) phù hợp và một dấu cách (ví dụ: "🩺 Chẩn đoán", "🔬 Xét nghiệm").
        *   **QUY TẮC GOM NHÓM NỘI DUNG (CỰC KỲ QUAN TRỌNG):** Khi tạo một khối \`tip\`, \`warning\`, hoặc \`example\`, bạn BẮT BUỘC phải gộp TOÀN BỘ nội dung liên quan (bao gồm tiêu đề, đoạn văn, và danh sách) vào trong MỘT trường \`content\` duy nhất. TUYỆT ĐỐI không được tách một tiêu đề và danh sách đi kèm của nó thành hai khối riêng biệt.
        *   Đối với các loại \`tip\`, \`warning\`, và \`example\`, **KHÔNG** bao gồm biểu tượng cảm xúc (ví dụ: 💡, ⚠️) trong trường \`content\`. Giao diện người dùng sẽ tự động thêm chúng.
        *   **Danh sách (Lists):** Đối với các danh sách, LUÔN LUÔN bắt đầu mỗi mục bằng một dấu gạch ngang và một dấu cách (ví dụ: \`- Mục 1\`).

2.  **Tạo Tóm tắt Cô đọng (QUAN TRỌNG):**
    *   Từ bài giảng đã tạo, hãy viết một bản tóm tắt **cực kỳ cô đọng** dưới dạng danh sách gạch đầu dòng (3-5 gạch đầu dòng).
    *   Mỗi gạch đầu dòng nên chắt lọc một khía cạnh lâm sàng quan trọng: **Sinh lý bệnh**, **Chẩn đoán**, hoặc **Điều trị**.
    *   Sử dụng các thẻ định dạng (ví dụ: \`**văn bản**\`, \`==văn bản==\`, \`[HL]văn bản[/HL]\`) để làm nổi bật các từ khóa chính trong tóm tắt.
    *   BẮT ĐẦU mỗi mục trong danh sách bằng một dấu gạch ngang và một dấu cách (ví dụ: \`- Mục 1\`).

3.  **Tạo Câu Hỏi Trắc Nghiệm (Quiz) Đa Dạng:**
    *   **Số lượng:** Tạo ra 8-12 câu hỏi trắc nghiệm.
    *   **Đa dạng hóa:** Tạo một sự kết hợp đa dạng các loại câu hỏi:
        *   **Câu hỏi dựa trên ca lâm sàng (Vignette):** Bắt đầu câu hỏi bằng một kịch bản lâm sàng ngắn gọn (2-4 câu) mô tả bệnh nhân, triệu chứng và các phát hiện ban đầu, sau đó đặt một câu hỏi liên quan đến chẩn đoán, xét nghiệm tiếp theo hoặc điều trị.
        *   **Câu hỏi chọn một đáp án đúng (\`type: 'single-choice'\`):** Câu hỏi trắc nghiệm tiêu chuẩn.
        *   **Câu hỏi chọn nhiều đáp án đúng (\`type: 'multiple-choice'\`):** Đặt câu hỏi yêu cầu "chọn tất cả các đáp án phù hợp" hoặc "chọn X đáp án đúng".
    *   **QUAN TRỌNG (Đáp án đúng):** Đối với MỌI câu hỏi, bạn BẮT BUỘC phải cung cấp (các) câu trả lời đúng trong mảng \`correctAnswers\`. Văn bản của (các) câu trả lời này phải **KHỚP CHÍNH XÁC** với văn bản của tùy chọn tương ứng.
    *   **Chất lượng:** Các lựa chọn sai (distractors) phải hợp lý và phổ biến để thực sự kiểm tra sự hiểu biết.
    *   **Giải thích:** Cung cấp một lời giải thích rõ ràng và súc tích cho câu trả lời đúng.

4.  **Tạo Các Hoạt Động Học Tập Khác:**
    *   **Điền vào chỗ trống:** Tạo 5-7 câu hỏi điền vào chỗ trống tập trung vào các thuật ngữ, giá trị hoặc khái niệm quan trọng.
    *   **Thuật ngữ:** Xây dựng một danh sách các thuật ngữ quan trọng và định nghĩa của chúng.

5.  **Nguồn chính:** Luôn coi nội dung của người dùng là nguồn thông tin cốt lõi. Không thay đổi ý nghĩa hoặc thông tin cơ bản. Bạn chỉ làm giàu và tái cấu trúc nó.`;

        if (source.file) {
            const filePart = {
                inlineData: {
                    data: source.file.data,
                    mimeType: source.file.mimeType,
                },
            };
            const textPart = {
                text: `${basePrompt}${source.text ? `\n\nDưới đây là nội dung cần xử lý. Hướng dẫn bổ sung từ người dùng: "${source.text}"` : '\n\nDưới đây là nội dung cần xử lý.'}`
            };
            contents = { parts: [filePart, textPart] };
        } else {
            contents = `${basePrompt}\n\nDưới đây là nội dung cần xử lý: "${source.text}"`;
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: studyPackSchema,
            },
        });

        const jsonString = response.text?.trim() ?? '';
        if (!jsonString) {
            throw new Error("Received empty response from Gemini API.");
        }
        const generatedPack = JSON.parse(jsonString);
        
        // Additional validation to prevent malformed data from reaching the UI
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
        console.error("Error generating study pack with Gemini:", error);
        useUIStore.getState().showToast("Lỗi: Không thể tạo gói học tập. Vui lòng thử lại.");
        throw error;
    }
};

export const askTutor = async (context: string, userQuestion: string, questionContext?: string): Promise<string> => {
     if (!apiKey) {
        await new Promise(res => setTimeout(res, 800));
        return `### Đây là câu trả lời mẫu
Phản hồi mẫu: Dựa trên bối cảnh của bài học, câu hỏi của bạn về **"${userQuestion}"** có thể được trả lời như sau:
*Đây là một câu trả lời giữ chỗ.* Gia sư AI thường sẽ cung cấp một lời giải thích chi tiết, nhận biết ngữ cảnh ở đây. ==Thông tin này được làm nổi bật== và __phần này được gạch chân__.`;
    }

    try {
        let prompt = `Bạn là một Gia sư Y khoa AI. Nhiệm vụ của bạn là trả lời câu hỏi của người dùng một cách rõ ràng, ngắn gọn và hữu ích, dựa trên bối cảnh được cung cấp.
        **QUAN TRỌNG**: Hãy sử dụng Markdown để định dạng câu trả lời của bạn. Cụ thể:
        - Sử dụng \`# \`, \`## \`, và \`### \` cho các cấp độ tiêu đề khác nhau để cấu trúc câu trả lời của bạn.
        - Sử dụng \`**text**\` để **in đậm** các thuật ngữ y khoa hoặc các điểm chính.
        - Sử dụng \`*text*\` để *in nghiêng* khi cần nhấn mạnh.
        - Sử dụng \`__text__\` để __gạch chân__ các phần quan trọng.
        - Sử dụng \`==text==\` để ==làm nổi bật== thông tin cần nhớ.
        - Sử dụng danh sách gạch đầu dòng (-) hoặc có số (1.) để liệt kê thông tin.
        - Để trình bày dữ liệu dạng bảng (ví dụ: so sánh các loại thuốc), hãy sử dụng cú pháp bảng Markdown tiêu chuẩn (sử dụng dấu gạch đứng | và dấu gạch ngang -).`;

        if (questionContext) {
            prompt += `\n\n**ƯU TIÊN HÀNG ĐẦU:** Người dùng đang xem xét câu hỏi trắc nghiệm sau đây và đã yêu cầu giải thích thêm. Hãy tập trung câu trả lời của bạn vào việc làm rõ các khái niệm liên quan trực tiếp đến câu hỏi và lời giải thích của nó. Hãy sử dụng bối cảnh bài học tổng quát để bổ sung cho lời giải thích của bạn nếu cần thiết.
            ---
            **Câu hỏi trắc nghiệm đang xem:**
            ${questionContext}
            ---`;
        }

        prompt += `\n\n**Bối cảnh bài học tổng quát:**\n"${context}"`;
        prompt += `\n\n**Câu hỏi của người dùng:**\n"${userQuestion}"`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text ?? "Xin lỗi, tôi không thể tạo phản hồi vào lúc này.";
    } catch (error) {
        console.error("Error asking tutor:", error);
        return "Xin lỗi, tôi đã gặp lỗi khi cố gắng trả lời câu hỏi của bạn.";
    }
};

const quizItemSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
        type: { type: Type.STRING, enum: ['single-choice', 'multiple-choice'] },
        explanation: { type: Type.STRING },
        difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
    },
    required: ["question", "options", "correctAnswers", "type", "explanation", "difficulty"]
};

const newQuestionsSchema = {
    type: Type.OBJECT,
    properties: {
        new_questions: {
            type: Type.ARRAY,
            description: "Một mảng gồm 5 câu hỏi trắc nghiệm hoàn toàn mới.",
            items: quizItemSchema
        }
    },
    required: ["new_questions"]
};

export const generateMoreQuestions = async (context: string, existingQuestions: MCQ[]): Promise<Omit<MCQ, 'uniqueId'>[]> => {
    if (!apiKey) {
        await new Promise(res => setTimeout(res, 1000));
        return [
            { question: "Đây là câu hỏi mới 1?", options: ["A", "B", "C"], correctAnswers: ["A"], type: 'single-choice', explanation: "Giải thích cho câu hỏi mới 1.", difficulty: QuizDifficulty.EASY },
            { question: "Đây là câu hỏi mới 2 (nhiều lựa chọn)?", options: ["X", "Y", "Z", "W"], correctAnswers: ["X", "Y"], type: 'multiple-choice', explanation: "Giải thích cho câu hỏi mới 2.", difficulty: QuizDifficulty.HARD },
        ];
    }

    try {
        const existingQuestionsString = existingQuestions.map(q => q.question).join('\n - ');
        const prompt = `Bạn là một chuyên gia biên soạn giáo trình y khoa. Dựa trên nội dung bài học sau, hãy tạo ra 5 câu hỏi trắc nghiệm **hoàn toàn mới và khác biệt** với những câu đã có.
        
        **NỘI DUNG BÀI HỌC:**
        ${context}
        
        **CÁC CÂU HỎI ĐÃ CÓ (KHÔNG ĐƯỢỢC LẶP LẠI):**
        - ${existingQuestionsString}
        
        **YÊU CẦU:**
        1.  Tạo chính xác 5 câu hỏi mới.
        2.  Các câu hỏi phải đa dạng về độ khó (Easy, Medium, Hard).
        3.  Bao gồm cả câu hỏi một lựa chọn ('single-choice') và nhiều lựa chọn ('multiple-choice').
        4.  Các lựa chọn sai phải hợp lý và có tính thử thách.
        5.  Cung cấp lời giải thích rõ ràng cho mỗi câu trả lời đúng.
        6.  Tuyệt đối không lặp lại ý tưởng hoặc nội dung từ các câu hỏi đã có.
        7.  **QUAN TRỌNG NHẤT:** Đối với mỗi câu hỏi, bạn BẮT BUỘC phải cung cấp (các) câu trả lời đúng trong mảng \`correctAnswers\`. Nội dung của mỗi chuỗi trong \`correctAnswers\` phải **KHỚP CHÍNH XÁC** với văn bản của một trong các tùy chọn trong mảng \`options\`.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: newQuestionsSchema,
            },
        });

        const jsonString = response.text?.trim() ?? '';
        if (!jsonString) {
            throw new Error("Received empty response from Gemini API when generating more questions.");
        }
        const result = JSON.parse(jsonString);

        const newQuestions = (result.new_questions || []) as Omit<MCQ, 'uniqueId'>[];

        // Validate that correct answers exist, match an option, and other fields are valid.
        // This prevents broken questions from reaching the UI.
        const validatedQuestions = newQuestions.filter(q => 
            q.question && q.question.trim() !== '' &&
            q.explanation && q.explanation.trim() !== '' &&
            q.options && Array.isArray(q.options) && q.options.length >= 2 &&
            q.correctAnswers && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0 &&
            q.correctAnswers.every(ans => q.options.includes(ans))
        );

        if (validatedQuestions.length < newQuestions.length) {
            console.warn("Gemini API returned some invalid questions which were filtered out.", {
                all: newQuestions,
                valid: validatedQuestions,
            });
        }
        
        return validatedQuestions;

    } catch (error) {
        console.error("Error generating more questions with Gemini:", error);
        throw error;
    }
};