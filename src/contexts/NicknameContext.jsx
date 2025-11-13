import React, { createContext, useEffect, useState } from 'react';

const KEY = 'mosaic:nickname';

export const NicknameContext = createContext({
  nickname: null,
  setNickname: () => {},
  clearNickname: () => {},
});

export function NicknameProvider({ children }) {
  const [nickname, setNicknameState] = useState(() => {
    try {
      return localStorage.getItem(KEY) || null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (nickname) localStorage.setItem(KEY, nickname);
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }, [nickname]);

  const setNickname = (value) => {
    const v = String(value || '').trim().slice(0, 32);
    setNicknameState(v || null);
  };

  const clearNickname = () => setNicknameState(null);

  return (
    <NicknameContext.Provider value={{ nickname, setNickname, clearNickname }}>
      {children}
    </NicknameContext.Provider>
  );
}

export default NicknameContext;
