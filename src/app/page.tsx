"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Plus, Trash2, Save, FileText, Copy, Search, Loader2 } from "lucide-react";

// Tipos
interface CardConfig {
  id: string;
  name: string;
  type: 'text' | 'dropdown';
  options: string[];
  includeInHeader: boolean;
}

interface Release {
  id: number;
  osNumber: string;
  cardId: string;
  cardName: string;
  value: string;
  responsible: string;
  releaseDate: string;
  type: 'initial' | 'complementary' | 'additional';
  additionalNumber?: number;
}

// URL da API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function EngineeringApp( ) {
  const [currentView, setCurrentView] = useState<'home' | 'release' | 'released'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // Estados da tela de liberação
  const [currentOS, setCurrentOS] = useState('');
  const [currentResponsible, setCurrentResponsible] = useState('');
  const [releaseData, setReleaseData] = useState<Record<string, string>>({});

  // Função para buscar todos os dados do servidor
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [cardsResponse, releasesResponse] = await Promise.all([
        fetch(`${API_URL}/cards`),
        fetch(`${API_URL}/releases`)
      ]);
      if (!cardsResponse.ok || !releasesResponse.ok) {
        throw new Error('Falha ao buscar dados do servidor.');
      }
      const cardsData = await cardsResponse.json();
      const releasesData = await releasesResponse.json();
      setCards(cardsData || []);
      setReleases(releasesData || []);
    } catch (error) {
      console.error("Falha ao buscar dados iniciais:", error);
      alert("Não foi possível carregar os dados do servidor. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega os dados quando o componente é montado
  useEffect(() => {
    fetchAllData();
  }, []);

  // Função para salvar os cartões (configuração)
  const handleSaveCards = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cards),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Falha ao salvar os cartões.' }));
        throw new Error(errorData.message);
      }
      
      const savedCards = await response.json();
      setCards(savedCards); // Atualiza o estado com os dados do servidor
      alert('Configurações salvas com sucesso!');
      setIsAdminAuthenticated(false);

    } catch (error) {
      console.error("Erro ao salvar cartões:", error);
      alert(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Função para salvar uma nova liberação
  const handleSaveRelease = async () => {
    if (!currentOS || !currentResponsible) {
      alert('Preencha o número da OS e o responsável!');
      return;
    }
    const hasData = Object.values(releaseData).some(value => value.trim() !== '');
    if (!hasData) {
      alert('Preencha pelo menos um campo!');
      return;
    }

    setIsSaving(true);
    const releaseDate = new Date().toISOString();
    const newReleasesPayload = [];

    for (const cardId in releaseData) {
        if (releaseData[cardId].trim()) {
            const card = cards.find(c => c.id === cardId);
            if (card) {
                newReleasesPayload.push({
                    osNumber: currentOS,
                    cardId: cardId,
                    cardName: card.name,
                    value: releaseData[cardId],
                    responsible: currentResponsible,
                    releaseDate: releaseDate,
                    type: 'initial'
                });
            }
        }
    }

    try {
      const response = await fetch(`${API_URL}/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReleasesPayload),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar a liberação no servidor.');
      }
      
      await fetchAllData(); // Re-busca todos os dados para ter a lista mais atual
      alert('Liberação salva com sucesso!');
      setCurrentOS('');
      setCurrentResponsible('');
      setReleaseData({});
      setCurrentView('released');

    } catch (error) {
      console.error("Erro ao salvar liberação:", error);
      alert(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminAccess = () => {
    if (adminPassword === 'eve123_dev') {
      setIsAdminAuthenticated(true);
      setShowAdmin(false);
      setAdminPassword('');
    } else {
      alert('Senha incorreta!');
    }
  };

  // Funções auxiliares para o painel de admin
  const addCard = () => setCards([...cards, { id: `temp-${Date.now()}`, name: '', type: 'text', options: [], includeInHeader: false }]);
  const updateCard = (id: string, field: keyof CardConfig, value: any) => setCards(cards.map(card => card.id === id ? { ...card, [field]: value } : card));
  const removeCard = (id: string) => setCards(cards.filter(card => card.id !== id));

  // Tela de Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Tela Inicial
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">Sistema de Engenharia</CardTitle>
            <p className="text-gray-600">Liberação de Códigos</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setCurrentView('release')} className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">Iniciar</Button>
            <Button onClick={() => setShowAdmin(true)} variant="outline" className="w-full h-12 text-lg"><Settings className="mr-2 h-5 w-5" />Admin</Button>
          </CardContent>
        </Card>
        
        {/* Modal de Senha Admin */}
        <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
          <DialogContent>
            <DialogHeader><DialogTitle>Acesso Administrativo</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label htmlFor="admin-password">Senha</Label>
              <Input id="admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()} />
            </div>
            <DialogFooter><Button onClick={handleAdminAccess}>Entrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal do Painel Administrativo */}
        <Dialog open={isAdminAuthenticated} onOpenChange={setIsAdminAuthenticated}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Painel Administrativo</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Configurar Cartões</h3>
                <Button onClick={addCard}><Plus className="mr-2 h-4 w-4" />Adicionar Cartão</Button>
              </div>
              {cards.map((card) => (
                <Card key={card.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Nome do Cartão</Label>
                      <Input value={card.name} onChange={(e) => updateCard(card.id, 'name', e.target.value)} />
                    </div>
                    <Button onClick={() => removeCard(card.id)} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleSaveCards} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Telas Principais (Liberação e Liberados)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistema de Engenharia</h1>
            <p className="text-gray-600">Gerenciamento de Liberação de Códigos</p>
          </div>
          <Button onClick={() => setCurrentView('home')} variant="outline">Voltar ao Início</Button>
        </div>
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="release">Liberação</TabsTrigger>
            <TabsTrigger value="released">Liberados</TabsTrigger>
          </TabsList>
          
          {/* Aba de Liberação */}
          <TabsContent value="release" className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número da OS</Label>
                    <Input value={currentOS} onChange={(e) => setCurrentOS(e.target.value)} placeholder="Digite o número da OS" />
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input value={currentResponsible} onChange={(e) => setCurrentResponsible(e.target.value)} placeholder="Nome do responsável" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <Card key={card.id}>
                  <CardHeader><CardTitle className="text-lg">{card.name}</CardTitle></CardHeader>
                  <CardContent>
                    <Input value={releaseData[card.id] || ''} onChange={(e) => setReleaseData({ ...releaseData, [card.id]: e.target.value })} placeholder="Digite o código" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center">
              <Button onClick={handleSaveRelease} disabled={isSaving} className="px-8 py-3 text-lg">
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isSaving ? 'Salvando...' : 'Salvar Liberação'}
              </Button>
            </div>
          </TabsContent>

          {/* Aba de Liberados */}
          <TabsContent value="released" className="space-y-6">
             <Card>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-semibold">OS</th>
                        <th className="text-left p-4 font-semibold">Responsável</th>
                        <th className="text-left p-4 font-semibold">Data</th>
                        {cards.map(card => (
                          <th key={card.id} className="text-left p-4 font-semibold">{card.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {
                        [...new Set(releases.map(r => r.osNumber))].map(osNumber => {
                          const osReleases = releases.filter(r => r.osNumber === osNumber);
                          const firstRelease = osReleases[0];
                          return (
                            <tr key={osNumber} className="border-b hover:bg-gray-50">
                              <td className="p-4 font-medium">{osNumber}</td>
                              <td className="p-4">{firstRelease.responsible}</td>
                              <td className="p-4">{new Date(firstRelease.releaseDate).toLocaleDateString('pt-BR')}</td>
                              {cards.map(card => {
                                const release = osReleases.find(r => r.cardId === card.id);
                                return <td key={card.id} className="p-4">{release ? release.value : '-'}</td>
                              })}
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
