import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, ChevronLeft, ChevronRight, LogOut, Plus, Pencil, Trash2, Clock, Skull, Swords, Globe } from "lucide-react";
import { getCurrentUser, removeCurrentUser } from "@/App";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getMyAbsences, createAbsence, updateAbsence, deleteAbsence,
} from "@/lib/firestoreApi";

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_PL = ["Ndz", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];

const ABSENCE_COLORS = [
  "bg-gradient-to-r from-orange-600 to-red-700",
  "bg-gradient-to-r from-amber-500 to-orange-600",
  "bg-gradient-to-r from-red-600 to-red-800",
  "bg-gradient-to-r from-purple-600 to-purple-800",
  "bg-gradient-to-r from-emerald-600 to-emerald-800",
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [user] = useState(() => getCurrentUser());
  const [absences, setAbsences] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [selectingDates, setSelectingDates] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [reason, setReason] = useState("");
  const DAYS = language === "pl" ? DAYS_PL : DAYS_EN;

  useEffect(() => { loadAbsences(); }, []);

  const loadAbsences = async () => {
    try {
      const data = await getMyAbsences(user.discord_id);
      setAbsences(data);
    } catch (e) {
      toast.error(t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeCurrentUser();
    localStorage.removeItem("timeaway_site_access");
    navigate("/login");
  };

  const handleDayClick = (date) => {
    if (!selectingDates) {
      // Blokada — kliknięcie dnia bez trybu zaznaczania nic nie robi
      return;
    } else if (!selectedStartDate) {
      setSelectedStartDate(date);
      setSelectedEndDate(date);
      toast.info(t("clickEndDate"));
    } else {
      if (date >= selectedStartDate) {
        setSelectedEndDate(date);
      } else {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(date);
      }
      setShowAddModal(true);
      setSelectingDates(false);
    }
  };

  const handleAddAbsence = async () => {
    if (!selectedStartDate || !selectedEndDate) { toast.error(t("selectDates")); return; }
    try {
      await createAbsence(
        user.discord_id, user,
        format(selectedStartDate, "yyyy-MM-dd"),
        format(selectedEndDate, "yyyy-MM-dd"),
        reason
      );
      toast.success(t("absenceRecorded"));
      setShowAddModal(false);
      resetSelection();
      loadAbsences();
    } catch { toast.error(t("failedToRecord")); }
  };

  const handleEditAbsence = async () => {
    if (!selectedAbsence) return;
    try {
      await updateAbsence(
        selectedAbsence.id, user.discord_id,
        format(selectedStartDate, "yyyy-MM-dd"),
        format(selectedEndDate, "yyyy-MM-dd"),
        reason
      );
      toast.success(t("chroniclesAmended"));
      setShowEditModal(false);
      resetSelection();
      loadAbsences();
    } catch { toast.error(t("failedToAmend")); }
  };

  const handleDeleteAbsence = async (absenceId) => {
    try {
      await deleteAbsence(absenceId, user.discord_id, user.guild_nickname || user.username);
      toast.success(t("absencePurged"));
      loadAbsences();
    } catch { toast.error(t("failedToPurge")); }
  };

  const openEditModal = (absence) => {
    setSelectedAbsence(absence);
    setSelectedStartDate(parseISO(absence.start_date));
    setSelectedEndDate(parseISO(absence.end_date));
    setReason(absence.reason || "");
    setShowEditModal(true);
  };

  const resetSelection = () => {
    setSelectedStartDate(null); setSelectedEndDate(null);
    setReason(""); setSelectedAbsence(null); setSelectingDates(false);
  };

  const cancelSelection = () => { resetSelection(); setShowAddModal(false); setShowEditModal(false); };

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
      const s = parseISO(a.start_date), e = parseISO(a.end_date);
      return isWithinInterval(date, { start: s, end: e });
    });

  const isDateInSelection = (date) => {
    if (!selectingDates || !selectedStartDate) return false;
    if (!selectedEndDate) return isSameDay(date, selectedStartDate);
    return isWithinInterval(date, { start: selectedStartDate, end: selectedEndDate });
  };

  const getAvatarUrl = (avatar, discordId) =>
    avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png` : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-container">
        <div className="text-center">
          <Flame className="w-16 h-16 animate-fire text-orange-500 mx-auto mb-4" style={{ filter: "drop-shadow(0 0 20px rgba(255, 100, 0, 0.8))" }} />
          <p className="text-amber-200/80 font-cinzel tracking-wider">{t("summoningChronicles")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-container flex" data-testid="dashboard">
      {/* Sidebar */}
      <aside className="w-64 sidebar min-h-screen flex flex-col">
        <div className="p-4 border-b border-amber-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: "linear-gradient(180deg, rgba(226,88,34,0.3) 0%, rgba(139,37,0,0.3) 100%)" }}>
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h1 className="font-bold text-amber-200 font-cinzel tracking-wide">{t("appName")}</h1>
                <p className="text-xs text-amber-900/80">{t("absenceChronicle")}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setLanguage(language === "en" ? "pl" : "en")}
              className="text-amber-600 hover:text-amber-400 hover:bg-amber-900/20">
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {user && (
          <div className="p-4 border-b border-amber-900/30">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-amber-900/50">
                <AvatarImage src={getAvatarUrl(user.avatar, user.discord_id)} alt={user.username} />
                <AvatarFallback className="avatar-fallback">
                  {(user.guild_nickname || user.username)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-100 truncate font-cinzel">{user.guild_nickname || user.username}</p>
                <p className="text-xs text-amber-900/80 truncate">@{user.username}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 text-amber-500 font-cinzel flex items-center gap-2">
            <Skull className="w-3 h-3" />{t("myAbsences")}
          </h3>
          <ScrollArea className="h-[calc(100vh-320px)]">
            {absences.length === 0 ? (
              <p className="text-sm text-amber-900/60 italic">{t("noAbsences")}</p>
            ) : (
              <div className="space-y-2">
                {absences.map((absence, index) => (
                  <div key={absence.id} className="p-3 rounded diablo-card hover:border-amber-700/50 transition-all group"
                    data-testid={`absence-item-${absence.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${index % 2 === 0 ? "bg-orange-500" : "bg-amber-500"}`} />
                          <span className="text-sm font-medium text-amber-100">
                            {format(parseISO(absence.start_date), "MMM d")} – {format(parseISO(absence.end_date), "MMM d")}
                          </span>
                        </div>
                        {absence.reason && <p className="text-xs text-amber-900/70 mt-1 truncate italic">{absence.reason}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-600 hover:text-amber-400"
                          onClick={() => openEditModal(absence)} data-testid={`edit-absence-${absence.id}`}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-400"
                          onClick={() => handleDeleteAbsence(absence.id)} data-testid={`delete-absence-${absence.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="p-4 border-t border-amber-900/30">
          <Button variant="ghost" className="w-full justify-start text-amber-900/80 hover:text-amber-500 hover:bg-transparent"
            onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" />{t("leaveRealm")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-amber-600 hover:text-amber-400 hover:bg-amber-900/20" data-testid="prev-month-btn">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-3xl font-bold font-cinzel tracking-wide" style={{ color: "#DAA520", textShadow: "0 0 15px rgba(218,165,32,0.3)" }}>
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-amber-600 hover:text-amber-400 hover:bg-amber-900/20" data-testid="next-month-btn">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectingDates && (
              <Button variant="outline" onClick={cancelSelection} className="border-amber-900/50 text-amber-200 hover:bg-amber-900/20">
                {t("cancel")}
              </Button>
            )}
            <Button onClick={() => { resetSelection(); setSelectingDates(true); toast.info(t("clickStartDate")); }}
              className="btn-primary-diablo" data-testid="mark-absence-btn">
              <Swords className="w-4 h-4 mr-2" />{t("markAbsence")}
            </Button>
          </div>
        </div>

        {selectingDates && (
          <div className="mb-4 p-4 rounded-lg border-2 border-orange-600/70 flex items-center gap-3"
            style={{ background: "rgba(180,60,0,0.18)" }}>
            <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <p className="text-base text-orange-300 font-cinzel tracking-wide">
              {selectedStartDate
                ? `${t("startDate")}: ${format(selectedStartDate, "MMM d")} — ${t("clickEndDate")}`
                : t("clickStartDate")}
            </p>
          </div>
        )}

        {!selectingDates && (
          <div className="mb-4 p-3 rounded-lg border border-amber-900/30 flex items-center gap-3"
            style={{ background: "rgba(10,6,4,0.45)" }}>
            <Swords className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <p className="text-sm text-amber-700/80 font-crimson italic">
              Kliknij "Oznacz nieobecność" aby zaznaczyć dni na kalendarzu
            </p>
          </div>
        )}

        <div className="diablo-card rounded-lg overflow-hidden">
          <div className="calendar-grid" style={{ background: "linear-gradient(180deg, rgba(20,12,8,0.9) 0%, rgba(10,6,4,0.95) 100%)" }}>
            {DAYS.map((day) => <div key={day} className="calendar-header-cell py-4">{day}</div>)}
          </div>
          <div className="calendar-grid p-2">
            {getDaysInMonth().map((date, index) => {
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const dayAbsences = getAbsencesForDay(date);
              const isInSelection = isDateInSelection(date);
              return (
                <div key={index}
                  className={`calendar-cell ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${isInSelection ? "selecting" : ""}`}
                  style={{ cursor: selectingDates ? "pointer" : "default" }}
                  onClick={() => handleDayClick(date)} data-testid={`calendar-day-${format(date, "yyyy-MM-dd")}`}>
                  <div className={`calendar-cell-date ${isToday ? "today" : ""}`}>{format(date, "d")}</div>
                  <div className="mt-1 space-y-1">
                    {dayAbsences.slice(0, 3).map((absence, absIdx) => (
                      <div key={absence.id}
                        className={`absence-chip ${ABSENCE_COLORS[absIdx % ABSENCE_COLORS.length]} text-white`}
                        onClick={(e) => { e.stopPropagation(); openEditModal(absence); }}>
                        {absence.username}
                      </div>
                    ))}
                    {dayAbsences.length > 3 && <div className="text-xs text-amber-700">+{dayAbsences.length - 3} {t("more")}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="diablo-card border-amber-900/50">
          <DialogHeader><DialogTitle className="text-amber-200 font-cinzel tracking-wide text-xl">{t("recordAbsence")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-amber-200/80 font-cinzel">{t("startDate")}</Label>
                <Input type="date" value={selectedStartDate ? format(selectedStartDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setSelectedStartDate(parseISO(e.target.value))} className="input-dark" data-testid="start-date-input" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-amber-200/80 font-cinzel">{t("endDate")}</Label>
                <Input type="date" value={selectedEndDate ? format(selectedEndDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setSelectedEndDate(parseISO(e.target.value))} className="input-dark" data-testid="end-date-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-200/80 font-cinzel">{t("reasonOptional")}</Label>
              <Textarea placeholder={t("reasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)}
                className="input-dark resize-none" rows={3} data-testid="reason-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelSelection} className="border-amber-900/50 text-amber-200 hover:bg-amber-900/20">{t("cancel")}</Button>
            <Button onClick={handleAddAbsence} className="btn-primary-diablo" data-testid="confirm-absence-btn">{t("confirmAbsence")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="diablo-card border-amber-900/50">
          <DialogHeader><DialogTitle className="text-amber-200 font-cinzel tracking-wide text-xl">{t("amendRecord")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-amber-200/80 font-cinzel">{t("startDate")}</Label>
                <Input type="date" value={selectedStartDate ? format(selectedStartDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setSelectedStartDate(parseISO(e.target.value))} className="input-dark" data-testid="edit-start-date-input" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-amber-200/80 font-cinzel">{t("endDate")}</Label>
                <Input type="date" value={selectedEndDate ? format(selectedEndDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setSelectedEndDate(parseISO(e.target.value))} className="input-dark" data-testid="edit-end-date-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-200/80 font-cinzel">{t("reasonOptional")}</Label>
              <Textarea placeholder={t("reasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)}
                className="input-dark resize-none" rows={3} data-testid="edit-reason-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => { if (selectedAbsence) { handleDeleteAbsence(selectedAbsence.id); setShowEditModal(false); } }}
              className="bg-gradient-to-b from-red-700 to-red-900 border border-red-600" data-testid="delete-absence-modal-btn">
              <Trash2 className="w-4 h-4 mr-2" />{t("purge")}
            </Button>
            <Button onClick={handleEditAbsence} className="btn-primary-diablo" data-testid="update-absence-btn">{t("updateRecord")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
