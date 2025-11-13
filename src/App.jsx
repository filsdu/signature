import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import SignaturePage from "./pages/SignaturePage.jsx";
import ConfessionPage from "./pages/ConfessionPage.jsx";
import PhotoPage from "./pages/PhotoPage.jsx";
import WordCampaignBoard from "./pages/WordCampaignBoard.jsx";
import Campaigns from './pages/Campaigns.jsx';
import CreateCampaign from './pages/CreateCampaign.jsx';
import TextCampaign from './pages/TextCampaign.jsx';
import AudioCampaign from './pages/AudioCampaign.jsx';
import { NicknameProvider } from './contexts/NicknameContext';
import OnboardModal from './components/OnboardModal';

function NotFound() {
  return (
    <div className="container" style={{padding:'48px 16px'}}>
      <h1 style={{fontSize:22,marginBottom:6}}>Page not found</h1>
      <p style={{color:'#6b7280'}}>The page you’re looking for doesn’t exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <NicknameProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
          <Navbar />

          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/create-campaign" element={<CreateCampaign />} />
              <Route path="/text/:id" element={<TextCampaign />} />
              <Route path="/audio/:id" element={<AudioCampaign />} />
              <Route path="/signatures" element={<SignaturePage />} />
              <Route path="/confessions" element={<ConfessionPage />} />
              <Route path="/photos" element={<PhotoPage />} />
              <Route path="/word-campaigns" element={<WordCampaignBoard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <footer className="site-footer">
            <div className="container">
              Built with Supabase + Vite. Be kind, create cool walls ✌️
            </div>
          </footer>

          <OnboardModal />
        </div>
      </BrowserRouter>
    </NicknameProvider>
  );
}
