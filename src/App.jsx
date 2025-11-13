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
import { NicknameProvider } from './contexts/NicknameContext';
import OnboardModal from './components/OnboardModal';

function NotFound() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
      <p className="text-neutral-600">The page you’re looking for doesn’t exist.</p>
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
              <Route path="/signatures" element={<SignaturePage />} />
              <Route path="/confessions" element={<ConfessionPage />} />
              <Route path="/photos" element={<PhotoPage />} />
              <Route path="/word-campaigns" element={<WordCampaignBoard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <footer className="py-8 text-xs text-neutral-500 border-t border-neutral-200 bg-white">
            <div className="max-w-6xl mx-auto px-4">
              Built with Supabase + Vite. Be kind, create cool walls ✌️
            </div>
          </footer>

          <OnboardModal />
        </div>
      </BrowserRouter>
    </NicknameProvider>
  );
}
