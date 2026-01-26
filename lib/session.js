import { v4 as uuid } from 'uuid';

export const getSessionId = () => {
    if (typeof window === 'undefined') return null;
    let sessionId = localStorage.getItem('anon_session_id');
    if (!sessionId) {
        sessionId = uuid();
        localStorage.setItem('anon_session_id', sessionId);
    }
    return sessionId;
};
