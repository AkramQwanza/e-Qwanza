import { useState, useCallback } from "react";
import { ChatInterface, Message } from "@/components/ChatInterface";
import { ChatSidebar, ChatSession } from "@/components/ChatSidebar";
import { DocumentUpload, UploadedDocument } from "@/components/DocumentUpload";
import { ModeSelector, ChatMode } from "@/components/ModeSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RagSettings, RagConfig } from "@/components/RagSettings";
import { ThemeProvider } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [chatMode, setChatMode] = useState<ChatMode>('enterprise');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ragConfig, setRagConfig] = useState<RagConfig>(() => {
    const saved = localStorage.getItem('ragConfig');
    return saved ? JSON.parse(saved) : {
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      textProvider: "openai",
      textModel: "gpt-4o-mini",
    };
  });
  const { toast } = useToast();

  // Fonction pour créer une nouvelle session
  const createNewSession = useCallback(() => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: "Nouvelle conversation",
      lastMessage: "Conversation créée",
      timestamp: new Date(),
      messageCount: 0,
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  // Fonction pour sélectionner une session
  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Charger les messages de la session sélectionnée
    const sessionMsgs = sessionMessages[sessionId] || [];
    setMessages(sessionMsgs);
    setSidebarOpen(false);
  }, [sessionMessages]);

  // Fonction pour supprimer une session
  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    // Supprimer aussi les messages de cette session
    setSessionMessages(prev => {
      const newSessionMessages = { ...prev };
      delete newSessionMessages[sessionId];
      return newSessionMessages;
    });
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    toast({
      title: "Session supprimée",
      description: "La conversation a été supprimée avec succès.",
    });
  }, [currentSessionId, toast]);

  // Fonction pour renommer une session
  const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle } : s
    ));
    toast({
      title: "Session renommée",
      description: "Le nom de la conversation a été mis à jour.",
    });
  }, [toast]);

  // Fonctions pour gérer les documents
  const handleDocumentUpload = useCallback(async (files: FileList) => {
    const newDocuments = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: 'uploading' as const,
    }));
    
    setDocuments(prev => [...prev, ...newDocuments]);
    
    // Simulation du traitement des fichiers
    // Ici vous intégreriez avec votre API de traitement des documents
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => 
        newDocuments.find(newDoc => newDoc.id === doc.id) 
          ? { ...doc, status: 'processed' as const }
          : doc
      ));
      toast({
        title: "Documents traités",
        description: `${newDocuments.length} document(s) ont été ajoutés à votre base de connaissances.`,
      });
    }, 2000);
  }, [toast]);

  const handleDocumentDelete = useCallback((documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast({
      title: "Document supprimé",
      description: "Le document a été retiré de votre base de connaissances.",
    });
  }, [toast]);

  const handleModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    // Réinitialiser les données quand on change de mode
    setCurrentSessionId(null);
    setMessages([]);
    setSidebarOpen(false);
    
    toast({
      title: `Mode ${mode === 'enterprise' ? 'Entreprise' : 'Personnel'}`,
      description: `Vous êtes maintenant en mode ${mode === 'enterprise' ? 'entreprise avec historique' : 'personnel avec documents'}.`,
    });
  }, [toast]);

  // Fonction pour envoyer un message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentSessionId) {
      createNewSession();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: "user",
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    // Sauvegarder les messages dans la session
    setSessionMessages(prev => ({
      ...prev,
      [currentSessionId]: newMessages
    }));
    setIsLoading(true);

    // Mettre à jour la session avec le dernier message
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { 
            ...s, 
            lastMessage: content,
            timestamp: new Date(),
            messageCount: s.messageCount + 1,
            title: s.title === "Nouvelle conversation" 
              ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
              : s.title
          } 
        : s
    ));

    try {
      // Simulation d'appel API différent selon le mode
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const modeText = chatMode === 'enterprise' 
        ? "Basé sur les documents d'entreprise" 
        : `Basé sur ${documents.length} document(s) personnel(s)`;
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `${modeText}: "${content}". Ceci est une réponse simulée du mode ${chatMode}. L'intégration avec votre API FastAPI permettra d'obtenir des réponses RAG spécifiques.`,
        type: "bot",
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);
      // Sauvegarder les messages dans la session
      setSessionMessages(prev => ({
        ...prev,
        [currentSessionId]: finalMessages
      }));
      
      // Mettre à jour le compteur de messages
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messageCount: s.messageCount + 1 }
          : s
      ));

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'envoi du message.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, createNewSession, toast, messages, chatMode, documents.length]);

  // Créer une nouvelle session au premier chargement
  const handleNewChat = useCallback(() => {
    createNewSession();
  }, [createNewSession]);

  // Fonction pour gérer la configuration RAG
  const handleRagConfigChange = useCallback((newConfig: RagConfig) => {
    setRagConfig(newConfig);
    localStorage.setItem('ragConfig', JSON.stringify(newConfig));
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="chatbot-theme">
      <div className="h-screen flex bg-gradient-background">
        {/* Sidebar - Desktop */}
        <div className={cn(
          "hidden md:block transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0"
        )}>
          {sidebarOpen && (
            <>
              {chatMode === 'enterprise' ? (
                <ChatSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                  onNewChat={handleNewChat}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={handleRenameSession}
                />
              ) : (
                <DocumentUpload
                  documents={documents}
                  onDocumentUpload={handleDocumentUpload}
                  onDocumentDelete={handleDocumentDelete}
                />
              )}
            </>
          )}
        </div>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-0 h-full">
              {chatMode === 'enterprise' ? (
                <ChatSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                  onNewChat={handleNewChat}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={handleRenameSession}
                />
              ) : (
                <DocumentUpload
                  documents={documents}
                  onDocumentUpload={handleDocumentUpload}
                  onDocumentDelete={handleDocumentDelete}
                />
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          {/* Header - Fixed */}
          <header className="bg-card/50 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:bg-sidebar-accent"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                Assistant IA avec RAG
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ModeSelector
                currentMode={chatMode}
                onModeChange={handleModeChange}
              />
              {chatMode === 'personal' && (
                <RagSettings 
                  ragConfig={ragConfig}
                  onConfigChange={handleRagConfigChange}
                />
              )}
              <ThemeToggle />
            </div>
          </header>

          {/* Chat Interface - Takes remaining height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Index;