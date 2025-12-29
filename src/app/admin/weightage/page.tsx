'use client'

import { useState, useEffect } from 'react'

interface GradingConfig {
  id: number;
  class_id: number;
  className: string;
  weight_1: number;
  weight_2: number;
  weight_mid: number;
  weight_final: number;
}

export default function GradingSettings() {
  const [configs, setConfigs] = useState<GradingConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all classes and their configs
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/weightage');
      const data = await res.json();
      if (data.success) setConfigs(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, field: string, value: string) => {
    const newConfigs = [...configs];
    // @ts-ignore
    newConfigs[index][field] = parseFloat(value) || 0;
    setConfigs(newConfigs);
  };

  const handleSave = async (config: GradingConfig) => {
    const total = config.weight_1 + config.weight_2 + config.weight_mid + config.weight_final;
    if (total !== 100) {
      alert(`Warning: Weights currently total ${total}%. They should usually equal 100%.`);
      // We allow saving anyway, but warn the user
    }

    try {
      const res = await fetch('/api/admin/weightage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) alert('Settings saved for ' + config.className);
    } catch {
      alert('Failed to save');
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Grading Formula Settings</h1>
      <p className="mb-8 text-gray-600">Define how the Final Grade is calculated for each class. (Weights should add up to 100)</p>

      {loading ? <div>Loading...</div> : (
        <div className="grid gap-6">
          {configs.map((config, index) => (
            <div key={config.class_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
              
              <div className="w-1/5">
                <h3 className="text-lg font-bold text-gray-800">{config.className}</h3>
              </div>

              {/* Inputs */}
              <div className="flex gap-4 items-center flex-1">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Assess 1 (%)</label>
                  <input type="number" value={config.weight_1} onChange={(e) => handleChange(index, 'weight_1', e.target.value)} className="border p-2 rounded w-20 text-center"/>
                </div>
                <div className="text-gray-400 font-bold">+</div>
                
                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Assess 2 (%)</label>
                  <input type="number" value={config.weight_2} onChange={(e) => handleChange(index, 'weight_2', e.target.value)} className="border p-2 rounded w-20 text-center"/>
                </div>
                <div className="text-gray-400 font-bold">+</div>

                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Midterm (%)</label>
                  <input type="number" value={config.weight_mid} onChange={(e) => handleChange(index, 'weight_mid', e.target.value)} className="border p-2 rounded w-20 text-center"/>
                </div>
                <div className="text-gray-400 font-bold">+</div>

                <div className="flex flex-col">
                  <label className="text-xs text-gray-500 mb-1">Final Exam (%)</label>
                  <input type="number" value={config.weight_final} onChange={(e) => handleChange(index, 'weight_final', e.target.value)} className="border p-2 rounded w-20 text-center"/>
                </div>
                
                <div className="text-gray-400 font-bold">=</div>
                <div className={`font-bold ${config.weight_1 + config.weight_2 + config.weight_mid + config.weight_final === 100 ? 'text-green-600' : 'text-red-500'}`}>
                  {config.weight_1 + config.weight_2 + config.weight_mid + config.weight_final}%
                </div>
              </div>

              <button onClick={() => handleSave(config)} className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 ml-4">
                Save
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}