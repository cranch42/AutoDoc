"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Функция для обработки вложенной структуры узлов, игнорируя фреймы внутри фреймов
function findFrames(node) {
    let frames = [];
    // Проверяем, если узел является фреймом и не начинается с "Frame"
    if (node.type === "FRAME" && !node.name.startsWith("Frame")) {
        frames.push(node.name);
        return frames; // Прекращаем поиск в дочерних элементах фрейма
    }
    // Если узел имеет дочерние элементы, рекурсивно обрабатываем их
    if ("children" in node) {
        for (const child of node.children) {
            frames = frames.concat(findFrames(child));
        }
    }
    return frames;
}
// Функция для генерации описания через OpenAI
function generateDescription(apiKey, projectName, pageName, frames) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const prompt = `
    Project: ${projectName}
    Page: ${pageName}
    Generate a concise 1-2 sentence description of the page that focuses on the key elements, views, controls, and features visible in the frames. The description should capture the functionality, purpose, and interactions of the page. The frames are:
    ${frames.join(", ")}
  `;
        try {
            const response = yield fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini", // Используем актуальную модель GPT-3.5 или GPT-4
                    messages: [
                        { role: "system", content: "You are a helpful assistant who writes brief, simple descriptions focusing on key features, views, and functions of the page." },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 150, // Увеличиваем лимит для более полных ответов
                    temperature: 0.3, // Уменьшаем случайность для точных ответов
                }),
            });
            const data = yield response.json();
            return ((_d = (_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "Description not available.";
        }
        catch (error) {
            console.error("Error generating description:", error);
            return "Error generating description.";
        }
    });
}
// Показываем UI
figma.showUI(__html__, { width: 800, height: 640 });
// Слушаем события из UI
figma.ui.onmessage = (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (message.type === "getFrames") {
        const { figmaKey, apiKey } = message;
        if (!figmaKey || !apiKey) {
            figma.ui.postMessage({ type: "error", message: "Both Figma File Key and OpenAI API Key are required!" });
            return;
        }
        // Получаем название проекта
        const projectName = `https://www.figma.com/file/${figmaKey}`;
        // Загружаем все страницы
        yield figma.loadAllPagesAsync();
        // Получаем список страниц
        const pages = figma.root.children;
        // Инициализируем результат
        let result = `Project: ${projectName}\n\nPages:\n`;
        // Перебираем страницы
        for (const page of pages) {
            // Генерируем ссылку на страницу
            const nodeId = page.id.replace(':', '-'); // Figma использует '-' вместо ':'
            const link = `https://www.figma.com/file/${figmaKey}?node-id=${nodeId}`;
            result += `Page: ${page.name}\n`;
            result += `Link: ${link}\n`; // Добавляем ссылку на страницу
            // Загружаем содержимое текущей страницы
            yield page.loadAsync();
            // Находим все фреймы на странице
            const frames = findFrames(page);
            // Генерируем описание страницы
            const description = yield generateDescription(apiKey, projectName, page.name, frames);
            // Добавляем описание в результат
            result += `Description: ${description}\n\n`;
        }
        // Отправляем результат обратно в UI
        figma.ui.postMessage({ type: "result", result });
    }
});
