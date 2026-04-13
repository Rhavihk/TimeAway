import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAuditLogs } from "@/lib/firestoreApi";
import { Flame, Shield, User, Trash2 } from "lucide-react";

function formatTimestamp(ts) {
  if (!ts) return "—";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("pl-PL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogModal({ open, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getAuditLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="diablo-card border-amber-900/50 max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-amber-200 font-cinzel tracking-wide text-xl flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Dziennik zdarzeń
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-amber-700 font-cinzel">Ładowanie...</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-amber-900/60 italic font-crimson">Brak wpisów w dzienniku</div>
        ) : (
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded diablo-card border border-amber-900/20 flex gap-3 items-start">
                  {/* Ikona */}
                  <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    ${log.action === "moderator_deleted"
                      ? "bg-red-900/40 border border-red-700/50"
                      : "bg-amber-900/30 border border-amber-700/30"}`}>
                    {log.action === "moderator_deleted"
                      ? <Shield className="w-3.5 h-3.5 text-red-400" />
                      : <User className="w-3.5 h-3.5 text-amber-500" />}
                  </div>

                  {/* Treść */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${log.action === "moderator_deleted"
                          ? "bg-red-900/40 text-red-300 border border-red-700/40"
                          : "bg-amber-900/30 text-amber-400 border border-amber-700/30"}`}>
                        {log.action === "moderator_deleted" ? "Nadzorca" : "Użytkownik"}
                      </span>
                      <span className="text-sm text-amber-100 font-medium">
                        {log.performed_by}
                      </span>
                      <span className="text-sm text-amber-700">usunął nieobecność</span>
                      <span className="text-sm text-amber-200 font-medium">
                        {log.target_username}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-amber-800 flex-wrap">
                      <span>
                        📅 {log.absence_details?.start_date} → {log.absence_details?.end_date}
                      </span>
                      {log.absence_details?.reason && (
                        <span className="italic">„{log.absence_details.reason}"</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-amber-900/50">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>

                  <Trash2 className="w-3.5 h-3.5 text-amber-900/40 flex-shrink-0 mt-1" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <p className="text-xs text-amber-900/40 italic text-center mt-2">
          Wpisy usuwają się automatycznie po 7 dniach
        </p>
      </DialogContent>
    </Dialog>
  );
}
