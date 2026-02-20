import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface WhatsAppContactProps {
  apiUrl: string;
  apiKey: string;
}

export function WhatsAppContact({ apiUrl, apiKey }: WhatsAppContactProps) {
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWhatsAppNumber();
  }, []);

  const fetchWhatsAppNumber = async () => {
    try {
      const response = await fetch(`${apiUrl}/settings/whatsapp`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();

      if (data.success && data.number) {
        setWhatsappNumber(data.number);
      }
    } catch (error) {
      console.error("Error fetching WhatsApp number:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!whatsappNumber) {
      setShowPrompt(true);
      return;
    }

    // Format number (remove spaces, hyphens, and ensure it starts with country code)
    const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, "");
    const formattedNumber = cleanNumber.startsWith("+") ? cleanNumber.slice(1) : cleanNumber;

    // Open WhatsApp with pre-filled message
    const message = encodeURIComponent("Hi, I need help with Adamstown Cricket Club website.");
    window.open(`https://wa.me/${formattedNumber}?text=${message}`, "_blank");
  };

  if (loading || !whatsappNumber) {
    return null;
  }

  return (
    <>
      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleWhatsAppClick}
          className="size-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl animate-bounce"
          title="Contact us on WhatsApp"
        >
          <MessageCircle className="size-6 text-white" />
        </Button>
      </div>

      {/* Contact Prompt */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-green-500 flex items-center justify-center">
                    <MessageCircle className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Contact Us on WhatsApp</h3>
                    <p className="text-sm text-gray-600">Get quick support from our team</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrompt(false)}
                  className="size-8 p-0"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <p className="text-gray-700">
                WhatsApp contact has not been configured yet. Please contact the administrator
                to set up the WhatsApp contact number.
              </p>

              <Button
                onClick={() => setShowPrompt(false)}
                className="w-full bg-red-900 hover:bg-red-800"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
