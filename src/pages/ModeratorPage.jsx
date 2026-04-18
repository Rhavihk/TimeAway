import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO,
} from "date-fns";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Flame, ChevronLeft, ChevronRight, LogOut, Shield, Users, Settings, BookOpen,
  Eye, EyeOff, Skull, Trash2, Crown, Globe,
} from "lucide-react";
import { getModPassword, setModAccess } from "@/App";
import { useLanguage } from "@/contexts/LanguageContext";
import AuditLogModal from "@/pages/AuditLogModal";
import {
  getAllUsers, getAllAbsences, moderatorDeleteAbsence,
  updateSitePassword, updateModeratorPassword,
} from "@/lib/firestoreApi";

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_PL = ["Ndz", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];

const USER_COLORS = [
  { bg: "bg-gradient-to-r from-orange-600 to-red-700", text: "text-white" },
  { bg: "bg-gradient-to-r from-amber-500 to-orange-600", text: "text-black" },
  { bg: "bg-gradient-to-r from-red-600 to-red-800", text: "text-white" },
  { bg: "bg-gradient-to-r from-purple-600 to-purple-800", text: "text-white" },
  { bg: "bg-gradient-to-r from-emerald-600 to-emerald-800", text: "text-white" },
  { bg: "bg-gradient-to-r from-blue-600 to-blue-800", text: "text-white" },
  { bg: "bg-gradient-to-r from-pink-600 to-pink-800", text: "text-white" },
  { bg: "bg-gradient-to-r from-cyan-600 to-cyan-800", text: "text-white" },
];

export default function ModeratorPage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sitePassword, setSitePassword] = useState("");
  const [newModPassword, setNewModPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const modPassword = getModPassword();
  const DAYS = language === "pl" ? DAYS_PL : DAYS_EN;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [u, a] = await Promise.all([getAllUsers(), getAllAbsences()]);
      setUsers(u);
      setAbsences(a);
      setSelectedUsers(u.map((x) => x.id || x.discord_id));
    } catch {
      toast.error(t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setModAccess("");
    localStorage.removeItem("timeaway_mod_password");
    navigate("/login");
  };

  const handleDeleteAbsence = async (absenceId, username) => {
    if (!confirm(`${t("purgeConfirm")} ${username}?`)) return;
    try {
      await moderatorDeleteAbsence(absenceId, "Nadzorca");
      toast.success(t("absencePurged"));
      fetchData();
    } catch { toast.error(t("failedToPurge")); }
  };

  const handleUpdateSitePassword = async () => {
    if (!sitePassword.trim()) return;
    try {
      await updateSitePassword(modPassword, sitePassword);
      toast.success(t("passwordUpdated"));
      setSitePassword("");
    } catch { toast.error(t("failedToUpdate")); }
  };

  const handleUpdateModPassword = async () => {
    if (!newModPassword.trim()) return;
    try {
      await updateModeratorPassword(modPassword, newModPassword);
      // Update localStorage so current session still works
      localStorage.setItem("timeaway_mod_password", newModPassword);
      toast.success(t("passwordUpdated"));
      setNewModPassword("");
    } catch { toast.error(t("failedToUpdate")); }
  };

  const getUserColor = (userId) => {
    const idx = users.findIndex((u) => (u.id || u.discord_id) === userId);
    return USER_COLORS[idx % USER_COLORS.length] || USER_COLORS[0];
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startPad = [];
    for (let i = start.getDay() - 1; i >= 0; i--)
      startPad.push(new Date(start.getTime() - (i + 1) * 86400000));
    const endPad = [];
    for (let i = 1; i < 7 - end.getDay(); i++)
      endPad.push(new Date(end.getTime() + i * 86400000));
    return [...startPad, ...days, ...endPad];
  };

  const getAbsencesForDay = (date) =>
    absences.filter((a) => {
      if (!selectedUsers.includes(a.user_id)) return false;
      return isWithinInterval(date, { start: parseISO(a.start_date), end: parseISO(a.end_date) });
    });

  const toggleUser = (uid) =>
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center app-container">
      <Flame className="w-16 h-16 text-orange-500" style={{ filter: "drop-shadow(0 0 20px rgba(255,100,0,0.8))" }} />
    </div>
  );

  return (
    <div className="min-h-screen app-container flex" data-testid="moderator-page">
      {/* Sidebar */}
      <aside className="w-72 sidebar min-h-screen flex flex-col">
        <div className="p-4 border-b border-amber-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-400" style={{ filter: "drop-shadow(0 0 10px rgba(218,165,32,0.5))" }} />
              <div>
                <h1 className="font-bold text-amber-200 font-cinzel">{t("overseerSanctum")}</h1>
                <p className="text-xs text-amber-900/80">{t("allSeeingEye")}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setLanguage(language === "en" ? "pl" : "en")}
              className="text-amber-600 hover:text-amber-400">
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Warriors list */}
        <div className="p-4 border-b border-amber-900/30 flex-shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-amber-500 font-cinzel flex items-center gap-2">
            <Users className="w-3 h-3" />{t("warriors")} ({users.length})
          </h3>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {users.map((user) => {
                const uid = user.id || user.discord_id;
                const color = getUserColor(uid);
                return (
                  <div key={uid} className="flex items-center gap-2 p-2 rounded hover:bg-amber-900/10 cursor-pointer"
                    onClick={() => toggleUser(uid)}>
                    <Checkbox checked={selectedUsers.includes(uid)} className="border-amber-700" />
                    <span className="text-sm text-amber-100 flex-1 truncate">{user.guild_nickname || user.username}</span>
                    <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                  </div>
                );
              })}
              {users.length === 0 && <p className="text-sm text-amber-900/60 italic">{t("noWarriors")}</p>}
            </div>
          </ScrollArea>
        </div>

        {/* Absence list */}
        <div className="flex-1 p-4 border-b border-amber-900/30 overflow-hidden">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-amber-500 font-cinzel flex items-center gap-2">
            <Skull className="w-3 h-3" />{t("allAbsences")}
          </h3>
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {absences.filter((a) => selectedUsers.includes(a.user_id)).slice(0, 20).map((absence) => (
                <div key={absence.id} className="p-2 rounded diablo-card group flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-100 truncate">{absence.username}</p>
                    <p className="text-xs text-amber-900/70">
                      {format(parseISO(absence.start_date), "MMM d")} – {format(parseISO(absence.end_date), "MMM d")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon"
                    className="h-6 w-6 text-red-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteAbsence(absence.id, absence.username)}
                    data-testid={`mod-delete-absence-${absence.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {absences.length === 0 && <p className="text-sm text-amber-900/60 italic">{t("noAbsencesRecorded")}</p>}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-amber-600 hover:text-amber-400 hover:bg-transparent"
            onClick={() => setShowSettingsModal(true)} data-testid="settings-btn">
            <Settings className="w-4 h-4 mr-2" />{t("sigilSettings")}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-amber-900/80 hover:text-amber-500 hover:bg-transparent"
            onClick={() => setShowAuditLog(true)} data-testid="audit-log-btn">
              <BookOpen className="w-4 h-4 mr-2" />Dziennik zdarzeń
            </Button>
            <Button variant="ghost" className="w-full justify-start text-amber-900/80 hover:text-amber-500 hover:bg-transparent"
            onClick={handleLogout} data-testid="mod-logout-btn">
            <LogOut className="w-4 h-4 mr-2" />{t("leaveSanctum")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-amber-600 hover:text-amber-400 hover:bg-amber-900/20" data-testid="mod-prev-month-btn">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-3xl font-bold font-cinzel tracking-wide" style={{ color: "#DAA520", textShadow: "0 0 15px rgba(218,165,32,0.3)" }}>
              {format(currentMonth, "LLLL yyyy", { locale: language === "pl" ? pl : undefined })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-amber-600 hover:text-amber-400 hover:bg-amber-900/20" data-testid="mod-next-month-btn">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-sm text-amber-700 font-cinzel">
            {t("viewing")} {selectedUsers.length} {t("of")} {users.length} {t("warriors").toLowerCase()}
          </div>
        </div>

        <div className="diablo-card rounded-lg overflow-hidden">
          <div className="calendar-grid" style={{ background: "linear-gradient(180deg, rgba(20,12,8,0.9) 0%, rgba(10,6,4,0.95) 100%)" }}>
            {DAYS.map((day) => <div key={day} className="calendar-header-cell py-4">{day}</div>)}
          </div>
          <div className="calendar-grid p-2">
            {getDaysInMonth().map((date, index) => {
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const dayAbsences = getAbsencesForDay(date);
              return (
                <div key={index}
                  className={`calendar-cell ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""}`}
                  data-testid={`mod-calendar-day-${format(date, "yyyy-MM-dd")}`}>
                  <div className={`calendar-cell-date ${isToday ? "today" : ""}`}>{format(date, "d")}</div>
                  <div className="mt-1 space-y-1">
                    {dayAbsences.slice(0, 4).map((absence) => {
                      const color = getUserColor(absence.user_id);
                      return (
                        <div key={absence.id} className={`absence-chip ${color.bg} ${color.text} group relative`}
                          title={`${absence.username}${absence.reason ? ": " + absence.reason : ""}`}>
                          <span className="truncate">{absence.username}</span>
                          <button className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-red-800 rounded px-1"
                            onClick={(e) => { e.stopPropagation(); handleDeleteAbsence(absence.id, absence.username); }}>
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                    {dayAbsences.length > 4 && <div className="text-xs text-amber-700">+{dayAbsences.length - 4} {t("more")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="diablo-card rounded-lg p-4">
            <p className="text-xs text-amber-700 font-cinzel uppercase tracking-wider">{t("totalWarriors")}</p>
            <p className="text-3xl font-bold text-amber-200 font-cinzel">{users.length}</p>
          </div>
          <div className="diablo-card rounded-lg p-4">
            <p className="text-xs text-amber-700 font-cinzel uppercase tracking-wider">{t("activeAbsences")}</p>
            <p className="text-3xl font-bold text-orange-400 font-cinzel">
              {absences.filter((a) => parseISO(a.end_date) >= new Date()).length}
            </p>
          </div>
          <div className="diablo-card rounded-lg p-4">
            <p className="text-xs text-amber-700 font-cinzel uppercase tracking-wider">{t("totalRecords")}</p>
            <p className="text-3xl font-bold text-red-400 font-cinzel">{absences.length}</p>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="diablo-card border-amber-900/50">
          <DialogHeader>
            <DialogTitle className="text-amber-200 font-cinzel tracking-wide text-xl flex items-center gap-2">
              <Settings className="w-5 h-5" />{t("sigilSettings")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-amber-200/80 font-cinzel">{t("changeRealmSigil")}</Label>
              <p className="text-xs text-amber-900/70 italic">{t("realmSigilHint")}</p>
              <div className="flex gap-2">
                <Input type={showPasswords ? "text" : "password"} placeholder={t("newRealmSigil")}
                  value={sitePassword} onChange={(e) => setSitePassword(e.target.value)}
                  className="input-dark" data-testid="new-site-password-input" />
                <Button onClick={handleUpdateSitePassword} className="btn-primary-diablo" data-testid="update-site-password-btn">
                  {t("update")}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-amber-200/80 font-cinzel">{t("changeOverseerSigil")}</Label>
              <p className="text-xs text-amber-900/70 italic">{t("overseerSigilHint")}</p>
              <div className="flex gap-2">
                <Input type={showPasswords ? "text" : "password"} placeholder={t("newOverseerSigil")}
                  value={newModPassword} onChange={(e) => setNewModPassword(e.target.value)}
                  className="input-dark" data-testid="new-mod-password-input" />
                <Button onClick={handleUpdateModPassword} className="btn-gold" data-testid="update-mod-password-btn">
                  {t("update")}
                </Button>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-center text-amber-700 hover:text-amber-400"
              onClick={() => setShowPasswords(!showPasswords)}>
              {showPasswords ? <><EyeOff className="w-4 h-4 mr-2" />{t("hideSigils")}</> : <><Eye className="w-4 h-4 mr-2" />{t("revealSigils")}</>}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}
              className="border-amber-900/50 text-amber-200 hover:bg-amber-900/20">{t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    <AuditLogModal open={showAuditLog} onClose={() => setShowAuditLog(false)} />
    </div>
  );
}
