import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Flame, Shield, Users, Skull, Globe } from "lucide-react";
import { setSiteAccess, setModAccess, setModPassword } from "@/App";
import { useLanguage } from "@/contexts/LanguageContext";
import { verifySitePassword, verifyModeratorPassword } from "@/lib/firestoreApi";

const DISCORD_CLIENT_ID = process.env.REACT_APP_DISCORD_CLIENT_ID;
const FUNCTIONS_URL = process.env.REACT_APP_FUNCTIONS_URL;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const [sitePassword, setSitePasswordInput] = useState("");
  const [modPassword, setModPasswordInput] = useState("");
  const [guildId, setGuildId] = useState("1456455515088617524");
  const [loading, setLoading] = useState(false);
  const [siteUnlocked, setSiteUnlocked] = useState(
    () => !!localStorage.getItem("timeaway_site_access")
  );

  useEffect(() => {
    const urlGuildId = searchParams.get("guild_id") || searchParams.get("server") || "1456455515088617524";
    if (urlGuildId) {
      setGuildId(urlGuildId);
      localStorage.setItem("timeaway_guild_id", urlGuildId);
      toast.info(t("serverDetected"));
    } else {
      const stored = localStorage.getItem("timeaway_guild_id");
      if (stored) setGuildId(stored);
    }
  }, [searchParams]);

  const handleSitePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await verifySitePassword(sitePassword);
      if (!ok) throw new Error("invalid");
      setSiteAccess("true");
      setSiteUnlocked(true);
      toast.success(t("gatesOpened"));
    } catch {
      toast.error(t("invalidSigil"));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = () => {
    if (!DISCORD_CLIENT_ID || !FUNCTIONS_URL) {
      toast.error(t("portalSealed"));
      return;
    }
    const redirectUri = encodeURIComponent(FUNCTIONS_URL + "/discordCallback");
    const state = guildId || "no_guild";
    const scope = "identify guilds guilds.members.read";
    const url =
      "https://discord.com/api/oauth2/authorize" +
      "?client_id=" + DISCORD_CLIENT_ID +
      "&redirect_uri=" + redirectUri +
      "&response_type=code" +
      "&scope=" + encodeURIComponent(scope) +
      "&state=" + state;
    window.location.href = url;
  };

  const handleModeratorLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await verifyModeratorPassword(modPassword);
      if (!ok) throw new Error("invalid");
      setModAccess("true");
      setModPassword(modPassword);
      toast.success(t("welcomeOverseer"));
      navigate("/moderator");
    } catch {
      toast.error(t("lackAuthority"));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => setLanguage(language === "en" ? "pl" : "en");

  return (
    <div className="min-h-screen login-bg">
      <div className="min-h-screen login-overlay flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-amber-500 hover:text-amber-300 hover:bg-amber-900/20 border border-amber-900/30"
            data-testid="language-switcher"
          >
            <Globe className="w-4 h-4" />
            {language === "en" ? "PL" : "EN"}
          </Button>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Flame className="w-16 h-16 text-orange-500" style={{ filter: "drop-shadow(0 0 20px rgba(255, 100, 0, 0.8))" }} />
            </div>
            <h1 className="text-4xl font-bold font-cinzel tracking-wider" style={{ color: "#DAA520", textShadow: "0 0 20px rgba(218, 165, 32, 0.5)" }}>
              {t("appName")}
            </h1>
            <p className="text-amber-900/80 mt-2 font-crimson italic">{t("tagline")}</p>
          </div>

          <Tabs defaultValue="user" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-amber-900/30">
              <TabsTrigger value="user" className="data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-200 text-amber-700">
                <Skull className="w-4 h-4 mr-2" />{t("warrior")}
              </TabsTrigger>
              <TabsTrigger value="moderator" className="data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-200 text-amber-700">
                <Shield className="w-4 h-4 mr-2" />{t("overseer")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="mt-4">
              <div className="diablo-card p-6 rounded-lg space-y-4">
                {!siteUnlocked ? (
                  <form onSubmit={handleSitePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-amber-200/80 font-cinzel text-sm">{t("realmSigil")}</Label>
                      <Input type="password" placeholder={t("enterSigil")} value={sitePassword}
                        onChange={(e) => setSitePasswordInput(e.target.value)} className="input-dark" data-testid="site-password-input" />
                    </div>
                    <Button type="submit" className="w-full btn-primary-diablo" disabled={loading} data-testid="site-password-submit">
                      {loading ? t("unsealing") : t("openGates")}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-amber-200/80 font-cinzel text-sm">{t("clanId")}</Label>
                      <Input type="text" placeholder={t("enterClanId")} value={guildId}
                        onChange={(e) => setGuildId(e.target.value)} className="input-dark" data-testid="guild-id-input" />
                      <p className="text-xs text-amber-900/60 italic">{t("clanIdHint")}</p>
                    </div>
                    <Button onClick={handleDiscordLogin} className="w-full btn-primary-diablo flex items-center justify-center gap-2"
                      disabled={loading} data-testid="discord-login-btn">
                      <Users className="w-4 h-4" />
                      {loading ? t("openingPortal") : t("enterDiscord")}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="moderator" className="mt-4">
              <div className="diablo-card p-6 rounded-lg">
                <form onSubmit={handleModeratorLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-amber-200/80 font-cinzel text-sm">{t("overseerSigil")}</Label>
                    <Input type="password" placeholder={t("enterOverseerSigil")} value={modPassword}
                      onChange={(e) => setModPasswordInput(e.target.value)} className="input-dark" data-testid="mod-password-input" />
                  </div>
                  <Button type="submit" className="w-full btn-primary-diablo" disabled={loading} data-testid="mod-login-btn">
                    {loading ? t("verifyingAuth") : t("accessSanctum")}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-center text-amber-900/40 text-xs mt-6 font-crimson italic">{t("footer")}</p>
        </div>
      </div>
    </div>
  );
}
