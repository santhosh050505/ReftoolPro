import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  History,
  Trash2,
  ArrowLeft,
  Clock,
  Thermometer,
  Gauge,
  Calendar,
  ChevronRight,
  ExternalLink,
  Zap,
  Edit2
} from 'lucide-react';
import { convertPressure } from '../../config/pressureUnits';
import { getHistory, deleteHistoryEntry, clearHistory } from '../../services/historyApiService';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import './HistoryPage.css';

const HistoryPage = () => {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const {
    pressureUnit,
    temperatureUnit,
    isAbsolute,
    ambientPressureData
  } = context;

  const { addToast } = useToast();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistory();
      setHistoryItems(data.history || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      addToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setHistoryItems([]);
      setShowClearConfirm(false);
      addToast('History cleared successfully', 'success');
    } catch (error) {
      addToast('Failed to clear history', 'error');
    }
  };

  const handleDeleteEntry = async () => {
    try {
      await deleteHistoryEntry(deleteItemId);
      setHistoryItems(prev => prev.filter(item => item._id !== deleteItemId));
      setDeleteItemId(null);
      addToast('Entry removed', 'success');
    } catch (error) {
      addToast('Failed to delete entry', 'error');
    }
  };

  const handleEditEntry = (item) => {
    const loadData = {
      refrigerant: item.refrigerant,
      pressure: item.pressure,
      temperature: item.temperature,
      isDew: item.isDew,
      isAbsolute: item.isAbsolute,
      name: item.name
    };

    sessionStorage.setItem('loadCalculationData', JSON.stringify(loadData));
    sessionStorage.setItem('lastSelectedRefrigerant', item.refrigerant);
    navigate('/');
  };

  const getAtmOffsetForUnit = (unit, data) => {
    if (!data) return 1.01325;
    const unitMapping = {
      'bar': 'bar', 'psi': 'psi', 'Pa': 'Pa', 'kPa': 'kPa', 'MPa': 'mpa',
      'atm': 'atm', 'at': 'at', 'mmHg': 'mm Hg', 'µmHg': 'µm Hg', 'inHg': 'In Hg'
    };
    const colName = unitMapping[unit] || unit;
    return parseFloat(data[colName]) || 1.01325;
  };

  const displayPressureValue = (item) => {
    try {
      if (item.pressure === undefined || item.pressure === null) return '-';

      const sourceUnit = item.pressureUnit || 'bar';
      const sourceIsAbs = item.isAbsolute !== undefined ? item.isAbsolute : true;
      const sourceVal = parseFloat(item.pressure);

      // 1. Convert to Absolute Bar (Source of Truth) using saved offset
      const sourceAtmOffsetBar = getAtmOffsetForUnit('bar', item.ambientPressureData);
      const sourceValBar = convertPressure(sourceVal, sourceUnit, 'bar');
      const absoluteBarVal = sourceIsAbs ? sourceValBar : sourceValBar + sourceAtmOffsetBar;

      // 2. Convert to Target Global Display Unit and Mode
      const targetUnit = pressureUnit || 'bar';
      const targetIsAbs = isAbsolute;
      const targetAtmOffsetDisplay = getAtmOffsetForUnit(targetUnit, ambientPressureData);

      const targetValDisplayAbs = convertPressure(absoluteBarVal, 'bar', targetUnit);
      const finalDisplayVal = targetIsAbs ? targetValDisplayAbs : targetValDisplayAbs - targetAtmOffsetDisplay;

      return finalDisplayVal.toFixed(2);
    } catch (e) {
      return item.pressure?.toFixed(2) || '-';
    }
  };

  const displayTemperatureValue = (item, tempKey = 'temperature') => {
    const tempVal = item[tempKey];
    if (tempVal === undefined || tempVal === null) return '-';
    let val = parseFloat(tempVal);
    const sourceUnit = (item.temperatureUnit || 'celsius').toLowerCase();
    const targetUnit = (temperatureUnit || 'celsius').toLowerCase();

    if (sourceUnit !== targetUnit) {
      if (targetUnit === 'fahrenheit') {
        val = (val * 9 / 5) + 32;
      } else {
        val = (val - 32) * 5 / 9;
      }
    }
    return val.toFixed(2);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="history-page loading">
        <div className="loader"></div>
        <p>Gathering your data...</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <div className="title-group">
            <h1>Recent Calculations</h1>
            <p>Your FIFO calculation log (Last 10 units)</p>
          </div>
        </div>
        {historyItems.length > 0 && (
          <button className="clear-history-btn" onClick={() => setShowClearConfirm(true)}>
            <Trash2 size={16} />
            <span>Clear Logs</span>
          </button>
        )}
      </div>

      {historyItems.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">
            <Zap size={50} />
          </div>
          <h3>Your history is clean</h3>
          <p>Successful calculations will automatically appear here for quick access later.</p>
          <button className="start-calc-btn" onClick={() => navigate('/')}>
            Launch Calculator
          </button>
        </div>
      ) : (
        <div className="history-list">
          {historyItems.map((item) => (
            <div key={item._id} className="history-card">
              <div className="card-main">
                <div className="card-top">
                  <div className="ref-badge">{item.refrigerant}</div>
                  <div className="date-time">
                    <Calendar size={14} />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <div className="card-content">
                  <div className="data-row">
                    <div className="data-item">
                      <div className="data-label">
                        <Gauge size={14} />
                        <span>Pressure</span>
                      </div>
                      <div className="data-value">
                        {displayPressureValue(item)}
                        <span className="unit">{pressureUnit}({isAbsolute ? 'a' : 'g'})</span>
                        <div className="status-badges">
                          <span className={`type-badge ${isAbsolute ? 'highlight' : ''}`}>
                            {isAbsolute ? 'ABS' : 'Gauge'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">
                        <Thermometer size={14} />
                        <span>Temperature</span>
                      </div>
                      <div className="data-value">
                        {displayTemperatureValue(item)}
                        <span className="unit">°{temperatureUnit === 'celsius' ? 'C' : 'F'}</span>
                        <div className="status-badges">
                          <span className={`type-badge ${item.isDew ? 'highlight' : ''}`}>
                            {item.isDew ? 'Dew' : 'Bubble'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={() => handleEditEntry(item)}
                  title="Edit Calculation"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => setDeleteItemId(item._id)}
                  title="Delete this entry"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title="Clear Logs"
        message="Are you sure you want to delete all recent calculations from your history?"
        variant="danger"
        confirmText="Clear History"
      />

      <ConfirmModal
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDeleteEntry}
        title="Remove Entry"
        message="Are you sure you want to remove this calculation from your history?"
        variant="warning"
        confirmText="Remove"
      />
    </div>
  );
};

export default HistoryPage;
