import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import handler from './api/proxy-research';

describe('Proxy Research API SSRF Protection', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
        mockReq = {
            method: 'POST',
            body: {}
        };
        mockRes = {
            setHeader: mock(() => {}),
            status: mock((code: number) => {
                mockRes.statusCode = code;
                return mockRes;
            }),
            json: mock((data: any) => {
                mockRes.body = data;
                return mockRes;
            }),
            end: mock(() => {})
        };
    });

    afterEach(() => {
        mock.restore();
    });

    it('should block unauthorized endpoints (SSRF protection)', async () => {
        mockReq.body = {
            provider: 'CUSTOM', // using a custom provider to hit the else branch
            query: 'test',
            endpoint: 'http://localhost:1337/internal-api' // Unauthorized endpoint
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized endpoint provided' });
    });

    it('should not block authorized endpoints', async () => {
        mockReq.body = {
            provider: 'KIMI',
            query: 'test',
            endpoint: 'https://api.moonshot.cn/v1/chat/completions'
        };

        // Note: this might fail later in the code due to missing API keys or fetch errors,
        // but it should NOT return a 403.
        await handler(mockReq, mockRes);

        expect(mockRes.status).not.toHaveBeenCalledWith(403);
    });

    it('should not block requests without endpoint', async () => {
        mockReq.body = {
            provider: 'CHATGPT',
            query: 'test'
            // no endpoint provided
        };

        await handler(mockReq, mockRes);

        expect(mockRes.status).not.toHaveBeenCalledWith(403);
    });
});
