import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Globe, Server, ExternalLink, Shield } from 'lucide-react';
import { Dialog } from './Dialog';

interface BuiltInBrowserModalProps {
  onClose: () => void;
  defaultUrl?: string;
}

export const BuiltInBrowserModal: React.FC<BuiltInBrowserModalProps> = ({
  onClose,
  defaultUrl = 'http://localhost:3000'
}) => {
  const [url, setUrl] = useState(defaultUrl);
  const [inputValue, setInputValue] = useState(defaultUrl);
  const [isSecure, setIsSecure] = useState(defaultUrl.startsWith('https'));

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputValue;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
    setInputValue(finalUrl);
    setIsSecure(finalUrl.startsWith('https'));
  };

  const handleRefresh = () => {
    const temp = url;
    setUrl('');
    setTimeout(() => setUrl(temp), 50);
  };

  return (
    <Dialog label="Built-In Browser" onClose={onClose} className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 select-none pointer-events-none">
      <div className="absolute inset-0 bg-[#080b10]/40 backdrop-blur-[2px] animate-backdrop-fade pointer-events-auto" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-full max-h-[800px] flex flex-col bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-modal-zoom pointer-events-auto">

        {/* Browser Chrome (Header) */}
        <div className="h-12 bg-slate-800 border-b border-slate-700/80 flex items-center px-3 gap-3 rounded-t-xl select-none">
          {/* Traffic Lights */}
          <div className="flex items-center space-x-1.5 mr-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-400 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-400 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors" />
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1">
            <button disabled title="Preview: history navigation is not wired yet" className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled title="Preview: history navigation is not wired yet" className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handleRefresh} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Address Bar */}
          <form onSubmit={handleNavigate} className="flex-1 max-w-2xl mx-auto flex items-center">
            <div className="w-full relative flex items-center bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-1">
              {isSecure ? (
                <Shield className="w-3.5 h-3.5 text-emerald-400 mr-2" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-slate-400 mr-2" />
              )}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-slate-200 font-mono focus:outline-none placeholder-slate-500"
                placeholder="Search or enter web address"
              />
              <Server className="w-3.5 h-3.5 text-slate-500 ml-2" />
            </div>
          </form>

          {/* Right Toolbar */}
          <div className="flex items-center space-x-2 ml-auto">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded transition-colors"
              title="Open in external browser"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 bg-white relative">
          {url ? (
            <iframe
              src={url}
              className="absolute inset-0 w-full h-full border-none"
              title="Built-in Browser"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-900 text-slate-500 font-mono text-sm">
              Connecting...
            </div>
          )}
        </div>

      </div>
    </Dialog>
  );
};
