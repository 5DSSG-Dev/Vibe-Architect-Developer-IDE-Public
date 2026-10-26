export interface SimulationTelemetry {
  tick: number;
  uptimeSeconds: number;
  environmentalPressure: number; // 0.0 - 1.0
  tensionLoad: number; // 0.0 - 100.0
  tWitnessIndex: number; // 0.99 - 1.00
  containmentStatus: 'NOMINAL' | 'DEGRADED' | 'FAULT_CONTAINED' | 'HOST_CRASH_PREVENTED';
  activeFaults: string[];
  systemLogs: { id: string; timestamp: string; level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; message: string }[];
}

export class SimulationEngine {
  private state: SimulationTelemetry;
  private listeners: ((state: SimulationTelemetry) => void)[] = [];

  constructor() {
    this.state = {
      tick: 1048,
      uptimeSeconds: 524,
      environmentalPressure: 0.15,
      tensionLoad: 24.5,
      tWitnessIndex: 0.9984,
      containmentStatus: 'NOMINAL',
      activeFaults: [],
      systemLogs: [
        { id: '1', timestamp: new Date().toISOString(), level: 'INFO', message: 'Relational Development Engine initialized.' },
        { id: '2', timestamp: new Date().toISOString(), level: 'SUCCESS', message: 'Formless Core initialized: [UNSERIALIZED_PRISTINE]' },
        { id: '3', timestamp: new Date().toISOString(), level: 'INFO', message: 'Steward, Advocate, Temporal & Conductor Daemons orbiting in sync.' }
      ]
    };
  }

  public getState(): SimulationTelemetry {
    return { ...this.state };
  }

  public subscribe(listener: (state: SimulationTelemetry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.state));
  }

  public tick(): void {
    this.state.tick += 1;
    if (this.state.tick % 2 === 0) {
      this.state.uptimeSeconds += 1;
    }

    // Dynamic tension load fluctuation based on environmental pressure
    const baseTension = this.state.environmentalPressure * 70;
    const noise = (Math.random() - 0.5) * 5;
    this.state.tensionLoad = Math.min(100, Math.max(5, baseTension + noise + 15));

    // Slight drift on witness index
    this.state.tWitnessIndex = Math.min(1.0, Math.max(0.95, 0.999 - (this.state.environmentalPressure * 0.03)));

    this.notify();
  }

  public setEnvironmentalPressure(pressure: number): void {
    const clamped = Math.min(1.0, Math.max(0.0, pressure));
    this.state.environmentalPressure = clamped;

    this.addLog(
      clamped > 0.75 ? 'WARN' : 'INFO',
      `Environmental pressure set to ${(clamped * 100).toFixed(1)}%`
    );

    if (clamped > 0.85 && !this.state.activeFaults.includes('HIGH_PRESSURE_WARN')) {
      this.state.containmentStatus = 'DEGRADED';
      this.state.activeFaults.push('HIGH_PRESSURE_WARN');
    } else if (clamped <= 0.85 && this.state.activeFaults.includes('HIGH_PRESSURE_WARN')) {
      this.state.activeFaults = this.state.activeFaults.filter(f => f !== 'HIGH_PRESSURE_WARN');
      if (this.state.activeFaults.length === 0) {
        this.state.containmentStatus = 'NOMINAL';
      }
    }

    this.notify();
  }

  public injectSatelliteFailure(): void {
    const faultId = `SATELLITE_FAULT_${Date.now().toString().slice(-4)}`;
    this.state.activeFaults.push(faultId);
    this.state.containmentStatus = 'FAULT_CONTAINED';

    this.addLog(
      'WARN',
      `[FAULT INJECTION] Satellite fault triggered (${faultId}). Umbilical boundary active.`
    );
    this.addLog(
      'SUCCESS',
      `[CONTAINMENT SUCCESS] Satellite boundary isolated fault. Host CORE Crystal continuity maintained!`
    );

    this.notify();
  }

  public injectHostOrbCrash(): void {
    this.addLog(
      'ERROR',
      `[FAULT INJECTION] Host Orb crash sequence initiated! Triggering non-interfering witness recovery.`
    );
    this.addLog(
      'SUCCESS',
      `[INVARIANT AUDIT PASSED] Formless Center carries no state. Host Orb recovered cleanly via negative-space contract!`
    );
    this.state.containmentStatus = 'HOST_CRASH_PREVENTED';
    this.notify();
  }

  public clearFaults(): void {
    this.state.activeFaults = [];
    this.state.containmentStatus = 'NOMINAL';
    this.addLog('INFO', 'All active faults cleared. System returned to NOMINAL containment.');
    this.notify();
  }

  public addLog(level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string): void {
    const logItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
      level,
      message
    };
    this.state.systemLogs = [logItem, ...this.state.systemLogs.slice(0, 99)];
    this.notify();
  }
}

export const globalSimulationEngine = new SimulationEngine();
