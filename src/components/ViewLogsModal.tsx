import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { CloseIcon, ClipboardIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';

interface ViewLogsModalProps {
  userId: string;
  onClose: () => void;
}

const ViewLogsModal: React.FC<ViewLogsModalProps> = ({ userId, onClose }) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedLogs = await api.getLogs(userId);
        setLogs(fetchedLogs);
      } catch (err) {
        setError(t('logsModal.error'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [userId, t]);

  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };
  
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardIcon className="w-6 h-6" />
              {t('logsModal.title')}
            </h2>
            <p className="text-gray-400">{t('logsModal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">
          {isLoading && <p className="text-center text-gray-300">{t('logsModal.loading')}</p>}
          {error && <p className="text-center text-red-400">{error}</p>}
          {!isLoading && !error && logs.length === 0 && <p className="text-center text-gray-400">{t('logsModal.empty')}</p>}
          {!isLoading && !error && logs.length > 0 && (
            <div className="w-full text-sm text-left text-gray-300">
                <div className="bg-gray-700 text-xs uppercase font-semibold sticky top-0 grid grid-cols-12 gap-4 px-4 py-2">
                    <div className="col-span-2">{t('logsModal.timestamp')}</div>
                    <div className="col-span-2">{t('logsModal.user')}</div>
                    <div className="col-span-1">{t('logsModal.ipAddress')}</div>
                    <div className="col-span-1">{t('logsModal.city')}</div>
                    <div className="col-span-1">{t('logsModal.action')}</div>
                    <div className="col-span-2 truncate">{t('logsModal.browser')}</div>
                    <div className="col-span-3">{t('logsModal.details')}</div>
                </div>
                <div className="divide-y divide-gray-700">
                    {logs.map(log => (
                        <div key={log.id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-700/50">
                            <div className="col-span-2 font-mono text-cyan-400">{formatTimestamp(log.timestamp)}</div>
                            <div className="col-span-2">{log.user_name || <span className="text-gray-500">{t('logsModal.anonymous')}</span>}</div>
                            <div className="col-span-1 font-mono">{log.ip_address}</div>
                            <div className="col-span-1">{log.city || '-'}</div>
                            <div className="col-span-1 font-semibold">{log.action}</div>
                            <div className="col-span-2 truncate" title={log.browser}>{log.browser}</div>
                            <div className="col-span-3 break-words">{log.details}</div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 p-6 bg-gray-800 border-t border-gray-700 rounded-b-lg flex-shrink-0">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">
            {t('logsModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewLogsModal;