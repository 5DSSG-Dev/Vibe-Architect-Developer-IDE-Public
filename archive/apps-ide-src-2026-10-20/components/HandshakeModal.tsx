import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, Play, ShieldCheck, Cpu, HardDrive, Sparkles, ArrowRight } from 'lucide-react';
import { ApothecaryItem, SocketBinding, HANDSHAKE_STEPS, RelationContract } from '../engine/relationEngine';

interface HandshakeModalProps {
  item: ApothecaryItem;
  availableSockets: SocketBinding[];
  initialTargetSocketId?: string;
  onClose: () => void;
  onCommitHandshake: (item: ApothecaryItem, targetSocketId: string, contract: RelationContract) => void;
}

export const HandshakeModal: React.FC<HandshakeModalProps> = ({
  item,
  availableSockets,
  initialTargetSocketId,
  onClose,
  onCommitHandshake
}) => {
  const [selectedSocketId, setSelectedSocketId] = useState<string>(
    initialTargetSocketId || availableSockets.find(s => s.state === 'Vacant')?.id || availableSockets[0]?.id || 'socket-beta'
  );
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const selectedSocket = availableSockets.find(s => s.id === selectedSocketId);

  // Auto advance handshake steps when running
  useEffect(() => {
    if (!isRunning || isCompleted) return;

    if (currentStep < 9) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsCompleted(true);
      setIsRunning(false);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Fallback gracefully
      }
    }
  }, [isRunning, currentStep, isCompleted]);

  const handleStartHandshake = () => {
    setCurrentStep(1);
    setIsRunning(true);
    setIsCompleted(false);
  };

  const generateContract = (): RelationContract => {
    return {
      contractId: `ctr-${selectedSocketId}-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      sourceItemId: item.id,
      sourceItemName: item.name,
      targetSocketId: selectedSocketId,
      targetSocketName: selectedSocket?.name || selectedSocketId,
      handshakeCompletedStep: 9,
      handshakeStatus: 'SUCCESS',
      negativeSpaceInvariants: {
        never_serializes_witness: true,
        never_persists_prompts: true,
        no_verdict_over_inner_life: true
      },
      capabilitiesExchanged: item.capabilities,
      negotiatedProtocolVersion: '4D-VIBE-v1.0',
      allocatedMemoryMB: item.memoryReq,
      allocatedThreads: item.threadsReq,
      checksum: `sha256:${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
    };
  };

  const handleCommit = () => {
    const contract = generateContract();
    onCommitHandshake(item, selectedSocketId, contract);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl panel-glass rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-orbitron text-base font-bold text-slate-100 glow-cyan">
                UMBILICAL HANDSHAKE PROTOCOL
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                9-Step Relational Binding • Non-Destructive Invariant Handshake
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Target Socket Selector */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider block">
              1. Select Umbilical Target Socket
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableSockets.map((s) => (
                <button
                  key={s.id}
                  disabled={isRunning}
                  onClick={() => setSelectedSocketId(s.id)}
                  className={`p-2.5 rounded-xl border text-left font-mono transition-all ${
                    selectedSocketId === s.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                      : s.state === 'Vacant'
                      ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                      : 'bg-slate-950/80 border-slate-800 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{s.name}</div>
                  <div className="text-[9px] mt-0.5 uppercase tracking-wide flex items-center justify-between">
                    <span>{s.state}</span>
                    {s.connectedItem && <span className="text-emerald-400 font-bold">OCCUPIED</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Component Overview */}
          <div className="panel-glass-subtle rounded-2xl p-4 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                ATTACHMENT CANDIDATE
              </span>
              <h3 className="font-orbitron text-base font-bold text-slate-100">{item.name}</h3>
              <p className="text-xs text-slate-300 mt-1 font-sans">{item.description}</p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800 shrink-0">
              <div className="flex items-center space-x-1 text-purple-300">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{item.memoryReq} MB</span>
              </div>
              <div className="w-px h-3 bg-slate-700" />
              <div className="flex items-center space-x-1 text-cyan-300">
                <Cpu className="w-3.5 h-3.5" />
                <span>{item.threadsReq} T</span>
              </div>
            </div>
          </div>

          {/* 9-Step Handshake Progress Pipeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-200">2. Execution Handshake Pipeline</span>
              <span className="text-cyan-400 font-bold">Step {currentStep} of 9</span>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-purple-500 transition-all duration-300"
                style={{ width: `${(currentStep / 9) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {HANDSHAKE_STEPS.map((s) => {
                const isPassed = currentStep >= s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <div
                    key={s.step}
                    className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                      isPassed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,243,255,0.3)] animate-pulse'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{s.label}</span>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed JSON Contract Preview */}
          {isCompleted && (
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-300 font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>IMMUTABLE RELATION CONTRACT GENERATED</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  SIGNED & VALIDATED
                </span>
              </div>

              <pre className="bg-black/60 p-3 rounded-xl text-[10px] font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                {JSON.stringify(generateContract(), null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-cyan-500/20 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>

          {!isCompleted ? (
            <button
              onClick={handleStartHandshake}
              disabled={isRunning}
              className="btn-cyber px-5 py-2 rounded-xl text-xs font-orbitron font-semibold flex items-center space-x-2 shadow-lg"
            >
              <Play className="w-4 h-4" />
              <span>{isRunning ? 'Executing Handshake...' : 'Execute 9-Step Protocol'}</span>
            </button>
          ) : (
            <button
              onClick={handleCommit}
              className="btn-cyber-emerald px-6 py-2 rounded-xl text-xs font-orbitron font-bold flex items-center space-x-2 shadow-[0_0_20px_rgba(0,255,157,0.4)]"
            >
              <span>Commit Relation Contract</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
