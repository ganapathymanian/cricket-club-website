import { useState, useEffect } from "react";
import { Euro, Clock, Link as LinkIcon, Save, RefreshCw, Mail, Cloud, Sun, ThermometerSun, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Textarea } from "./ui/textarea";

interface TrainingAdminPageProps {
  apiUrl: string;
  apiKey: string;
}

interface CoachingType {
  type: "1-to-1" | "1-to-2" | "1-to-3";
  label: string;
  fees: number;
  duration: number; // in minutes
}

interface TrainingSettings {
  coachingTypes: CoachingType[];
  stripePaymentLink: string;
  currency: string;
}

export function TrainingAdminPage({ apiUrl, apiKey }: TrainingAdminPageProps) {
  const [settings, setSettings] = useState<TrainingSettings>({
    coachingTypes: [
      { type: "1-to-1", label: "One-on-One Coaching", fees: 50, duration: 60 },
      { type: "1-to-2", label: "1-to-2 Coaching", fees: 70, duration: 60 },
      { type: "1-to-3", label: "1-to-3 Coaching", fees: 90, duration: 60 },
    ],
    stripePaymentLink: "",
    currency: "EUR"
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Weather notification state
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [customMessage, setCustomMessage] = useState(
    "☀️ Weather looks great for training! Coaches are available - why not sharpen your skills this week? 🏏"
  );

  // Temperature thresholds by season
  const getSeasonAndThreshold = () => {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) {
      return { season: "Spring", threshold: 8, emoji: "🌸" };
    } else if (month >= 6 && month <= 8) {
      return { season: "Summer", threshold: 12, emoji: "☀️" };
    } else if (month >= 9 && month <= 11) {
      return { season: "Autumn", threshold: 8, emoji: "🍂" };
    } else {
      return { season: "Winter", threshold: 5, emoji: "❄️" };
    }
  };

  // Fetch weather forecast for Adamstown, Dublin, Ireland
  const fetchWeatherForecast = async () => {
    setLoadingWeather(true);
    try {
      // Adamstown, Dublin coordinates: 53.3498° N, 6.4177° W (approximate)
      const lat = 53.3498;
      const lon = -6.4177;
      
      // Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Europe/Dublin&forecast_days=3`
      );
      
      const data = await response.json();
      console.log("Weather data:", data);
      setWeatherData(data);
      toast.success("Weather forecast loaded for Adamstown, Dublin");
    } catch (error) {
      console.error("Error fetching weather:", error);
      toast.error("Failed to fetch weather forecast");
    } finally {
      setLoadingWeather(false);
    }
  };

  // Check if weather is good for training
  const isWeatherGoodForTraining = () => {
    if (!weatherData?.daily) return false;
    
    const { threshold } = getSeasonAndThreshold();
    const maxTemps = weatherData.daily.temperature_2m_max;
    const precipProb = weatherData.daily.precipitation_probability_max;
    
    // Check if all 3 days have good weather
    for (let i = 0; i < maxTemps.length; i++) {
      if (maxTemps[i] < threshold || precipProb[i] > 50) {
        return false;
      }
    }
    return true;
  };

  // Get weather description for weathercode
  const getWeatherDescription = (code: number) => {
    const descriptions: { [key: number]: string } = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
    };
    return descriptions[code] || "Unknown";
  };

  // Send weather notification to all users
  const sendWeatherNotification = async () => {
    if (!weatherData) {
      toast.error("Please fetch weather forecast first");
      return;
    }

    setSendingNotification(true);
    try {
      const { season, threshold, emoji } = getSeasonAndThreshold();
      const isGood = isWeatherGoodForTraining();
      
      const response = await fetch(`${apiUrl}/notifications/weather-training`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          weatherData,
          season,
          threshold,
          isGoodWeather: isGood,
          customMessage,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Weather notification sent to ${data.notifiedCount || 'all'} users!`);
      } else {
        toast.error(data.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send weather notification");
    } finally {
      setSendingNotification(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWeatherForecast(); // Auto-fetch weather on load
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/training-settings`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Error fetching training settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateCoachingType = (type: "1-to-1" | "1-to-2" | "1-to-3", field: "fees" | "duration", value: number) => {
    setSettings({
      ...settings,
      coachingTypes: settings.coachingTypes.map(ct =>
        ct.type === type ? { ...ct, [field]: value } : ct
      )
    });
  };

  const saveSettings = async () => {
    if (!settings.stripePaymentLink) {
      toast.error("Please enter a Stripe payment link");
      return;
    }

    if (!settings.stripePaymentLink.includes("stripe.com") && !settings.stripePaymentLink.includes("buy.stripe.com")) {
      toast.error("Please enter a valid Stripe payment link");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/training-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success("Training settings saved successfully!");
      } else {
        toast.error(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-red-900">Training Settings</h2>
          <p className="text-gray-600 mt-2">
            Configure coaching fees, duration, and payment settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-red-900 hover:bg-red-800"
          >
            <Save className="size-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="size-8 mx-auto animate-spin text-red-900 mb-4" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* Coaching Types Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Types & Pricing</CardTitle>
              <CardDescription>
                Configure fees and duration for different coaching session types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings.coachingTypes.map(coachingType => (
                <div key={coachingType.type} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-red-900">
                      {coachingType.label}
                    </h3>
                    <span className="text-sm text-gray-500">{coachingType.type}</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Session Fees ({settings.currency})</Label>
                      <div className="flex items-center gap-2">
                        <Euro className="size-5 text-gray-500" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={coachingType.fees}
                          onChange={(e) => updateCoachingType(coachingType.type, "fees", parseFloat(e.target.value) || 0)}
                          placeholder="Enter fees"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <div className="flex items-center gap-2">
                        <Clock className="size-5 text-gray-500" />
                        <Input
                          type="number"
                          min="15"
                          step="15"
                          value={coachingType.duration}
                          onChange={(e) => updateCoachingType(coachingType.type, "duration", parseInt(e.target.value) || 60)}
                          placeholder="Enter duration"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-white rounded border text-sm">
                    <strong>Price Summary:</strong> {settings.currency} {coachingType.fees.toFixed(2)} for {coachingType.duration} minutes
                    ({(coachingType.fees / (coachingType.duration / 60)).toFixed(2)} {settings.currency}/hour)
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Currency Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Currency Settings</CardTitle>
              <CardDescription>Select your preferred currency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Currency</Label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Payment Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="size-5" />
                Stripe Payment Link
              </CardTitle>
              <CardDescription>
                Configure the Stripe payment link for session bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Stripe Payment Link URL</Label>
                <Input
                  type="url"
                  value={settings.stripePaymentLink}
                  onChange={(e) => setSettings({ ...settings, stripePaymentLink: e.target.value })}
                  placeholder="https://buy.stripe.com/..."
                />
                <p className="text-xs text-gray-500">
                  This link will be used to redirect users to payment after booking
                </p>
              </div>

              {settings.stripePaymentLink && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>Preview:</strong>
                  </p>
                  <a
                    href={settings.stripePaymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {settings.stripePaymentLink}
                  </a>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">How to get your Stripe Payment Link:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Log in to your Stripe Dashboard</li>
                  <li>Go to "Products" → "Payment Links"</li>
                  <li>Click "Create payment link"</li>
                  <li>Configure your product and pricing</li>
                  <li>Copy the generated payment link</li>
                  <li>Paste it here</li>
                </ol>
                <p className="text-xs text-blue-600 mt-3">
                  Note: You can create different payment links for different coaching types if needed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weather-Based Training Notification */}
          <Card className="border-blue-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Cloud className="size-5 text-blue-600" />
                Weather Forecast & Training Notifications
              </CardTitle>
              <CardDescription>
                Check weather for Adamstown, Dublin and notify members when conditions are ideal for training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Season Info */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      Current Season: {getSeasonAndThreshold().emoji} {getSeasonAndThreshold().season}
                    </p>
                    <p className="text-xs text-gray-500">
                      Minimum temperature for good training: {getSeasonAndThreshold().threshold}°C
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchWeatherForecast}
                    disabled={loadingWeather}
                  >
                    <RefreshCw className={`size-4 mr-2 ${loadingWeather ? "animate-spin" : ""}`} />
                    {loadingWeather ? "Loading..." : "Refresh Weather"}
                  </Button>
                </div>
              </div>

              {/* Weather Forecast Display */}
              {weatherData?.daily && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <ThermometerSun className="size-4" />
                    3-Day Forecast for Adamstown, Dublin
                  </h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {weatherData.daily.time.map((date: string, index: number) => {
                      const maxTemp = weatherData.daily.temperature_2m_max[index];
                      const minTemp = weatherData.daily.temperature_2m_min[index];
                      const precipProb = weatherData.daily.precipitation_probability_max[index];
                      const weatherCode = weatherData.daily.weathercode[index];
                      const { threshold } = getSeasonAndThreshold();
                      const isGood = maxTemp >= threshold && precipProb <= 50;
                      
                      return (
                        <div 
                          key={date}
                          className={`p-3 rounded-lg border ${
                            isGood 
                              ? "bg-green-50 border-green-300" 
                              : "bg-orange-50 border-orange-300"
                          }`}
                        >
                          <p className="font-semibold text-sm mb-1">
                            {new Date(date).toLocaleDateString("en-IE", { 
                              weekday: "short", 
                              month: "short", 
                              day: "numeric" 
                            })}
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-lg font-bold">
                                {maxTemp.toFixed(0)}°C
                              </p>
                              <p className="text-xs text-gray-500">
                                Low: {minTemp.toFixed(0)}°C
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs">{getWeatherDescription(weatherCode)}</p>
                              <p className="text-xs text-gray-500">
                                Rain: {precipProb}%
                              </p>
                            </div>
                          </div>
                          <div className={`mt-2 text-xs font-semibold ${isGood ? "text-green-700" : "text-orange-700"}`}>
                            {isGood ? "✅ Good for training" : "⚠️ Check conditions"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Weather Status */}
                  <div className={`p-4 rounded-lg border ${
                    isWeatherGoodForTraining() 
                      ? "bg-green-100 border-green-400" 
                      : "bg-yellow-100 border-yellow-400"
                  }`}>
                    {isWeatherGoodForTraining() ? (
                      <div className="flex items-start gap-3">
                        <Sun className="size-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-green-800">
                            🎉 Perfect Training Weather Ahead!
                          </p>
                          <p className="text-sm text-green-700 mt-1">
                            All 3 days show temperatures above {getSeasonAndThreshold().threshold}°C with low rain probability.
                            Great time to send a notification to encourage members to book training sessions!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <Cloud className="size-6 text-yellow-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-yellow-800">
                            ⚠️ Mixed Weather Conditions
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Some days may not be ideal for outdoor training. You can still send a notification
                            but consider mentioning indoor alternatives.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Message */}
              <div className="space-y-2">
                <Label>Custom Notification Message</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter a motivational message..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  This message will be included in the email notification to all members
                </p>
              </div>

              {/* Sample Messages */}
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs font-semibold text-gray-600 mb-2">Sample Messages (click to use):</p>
                <div className="space-y-2">
                  {[
                    "☀️ Weather looks great for training! Coaches are available - why not sharpen your skills this week? 🏏",
                    "🌤️ The sun is out and our coaches are ready! Perfect conditions to work on your technique. Book now!",
                    "🏏 Great weather + Available coaches = Your chance to improve! Don't miss this opportunity to train!",
                    "💪 Weather's looking perfect for cricket! Our coaches have slots open - let's make the most of it!"
                  ].map((msg, i) => (
                    <button
                      key={i}
                      className="block w-full text-left text-xs p-2 bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      onClick={() => setCustomMessage(msg)}
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Send Notification Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={sendWeatherNotification}
                  disabled={sendingNotification || !weatherData}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="size-4 mr-2" />
                  {sendingNotification ? "Sending..." : "Send Weather Notification to All Members"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Notification Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" />
                Email Notification Settings
              </CardTitle>
              <CardDescription>
                Configure email service for sending training availability notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">📧 Email Service Setup</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  When coaches update their availability, automatic email notifications will be sent to all members.
                  You need to configure environment variables for this feature to work.
                </p>
                
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-white rounded border">
                    <p className="font-semibold text-gray-900 mb-1">Required Environment Variables:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li><code className="bg-gray-100 px-2 py-0.5 rounded">EMAIL_API_KEY</code> - Your email service API key (Resend, SendGrid, etc.)</li>
                      <li><code className="bg-gray-100 px-2 py-0.5 rounded">EMAIL_SERVICE_URL</code> - Email API endpoint (default: Resend)</li>
                      <li><code className="bg-gray-100 px-2 py-0.5 rounded">FROM_EMAIL</code> - Sender email address</li>
                      <li><code className="bg-gray-100 px-2 py-0.5 rounded">APP_URL</code> - Your website URL for booking links</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded border">
                    <p className="font-semibold text-gray-900 mb-1">Recommended: Resend</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com</a></li>
                      <li>Get your API key from the dashboard</li>
                      <li>Verify your domain or use their test domain</li>
                      <li>Set the <code className="bg-gray-100 px-1 rounded">EMAIL_API_KEY</code> environment variable</li>
                      <li>Set <code className="bg-gray-100 px-1 rounded">FROM_EMAIL</code> to your verified email</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="font-semibold text-green-900 mb-1">✅ How It Works:</p>
                    <p className="text-green-800">
                      When a coach saves their availability with "Send email notification" checked,
                      all members receive a beautiful HTML email with a direct link to book training sessions.
                      The email includes the coach's name and encourages immediate booking.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Alternative Email Services:</h4>
                <p className="text-sm text-blue-800 mb-2">
                  You can use any email service that accepts HTTP POST requests:
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>Resend</strong> - Recommended (default configuration)</li>
                  <li><strong>SendGrid</strong> - Set EMAIL_SERVICE_URL to SendGrid API</li>
                  <li><strong>Mailgun</strong> - Set EMAIL_SERVICE_URL to Mailgun API</li>
                  <li><strong>AWS SES</strong> - Configure with SES endpoint</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <CardTitle>Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-4">
                {settings.coachingTypes.map(ct => (
                  <div key={ct.type} className="text-center p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-600">{ct.label}</p>
                    <p className="text-2xl font-bold text-red-900">
                      {settings.currency} {ct.fees.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{ct.duration} minutes</p>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-700">
                  <strong>Payment Status:</strong> {settings.stripePaymentLink ? "✅ Configured" : "❌ Not configured"}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}