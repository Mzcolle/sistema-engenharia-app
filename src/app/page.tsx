"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Plus, Trash2, Save, Loader2, FileText, Copy } from "lucide-react";

// ==================================
// INTERFACES E ESTADOS
// ==================================
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

interface Rule {
  id?: number;
  parent_card_id: string;
  parent_option_value: string;
  child_card_id: string;
  options: string[];
}

interface ChecklistItem {
  item: string;
  code: string;
  responsible: string;
  releaseDate: string;
  isHeader: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000/api";

export default function EngineeringApp( ) {
  const [currentView, setCurrentView] = useState<'home' | 'release' | 'released'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [currentOS, setCurrentOS] = useState('');
  const [currentResponsible, setCurrentResponsible] = useState('');
  const [releaseData, setReleaseData] = useState<Record<string, string>>({});
  
  // Estados do Checklist
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistOS, setChecklistOS] = useState('');
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>([]);

  // ==================================
  // LÓGICA DE DADOS
  // ==================================
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [cardsRes, releasesRes, rulesRes] = await Promise.all([
        fetch(`${API_URL}/cards`),
        fetch(`${API_URL}/releases`),
        fetch(`${API_URL}/rules`)
      ]);
      if (!cardsRes.ok || !releasesRes.ok || !rulesRes.ok) throw new Error('Falha ao buscar dados do servidor.');
      
      const cardsData = await cardsRes.json();
      const releasesData = await releasesRes.json();
      const rulesData = await rulesRes.json();

      setCards(cardsData || []);
      setReleases(releasesData || []);
      setRules(rulesData || []);
    } catch (error) {
      console.error("Falha ao buscar dados iniciais:", error);
      alert("Não foi possível carregar os dados do servidor. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleSaveCards = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cards),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Falha ao salvar os cartões.');
      const savedCards = await response.json();
      setCards(savedCards);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      alert(`Erro: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRules = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules)
      });
      if (!response.ok) throw new Error("Falha ao salvar regras.");
      alert("Regras salvas com sucesso!");
      await fetchAllData();
    } catch (error) {
      alert("Erro ao salvar regras.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRelease = async () => {
    if (!currentOS || !currentResponsible) return alert('Preencha o número da OS e o responsável!');
    if (!Object.values(releaseData).some(v => v.trim() !== '')) return alert('Preencha pelo menos um campo!');

    setIsSaving(true);
    const releaseDate = new Date().toISOString();
    const payload = Object.entries(releaseData)
      .filter(([, value]) => value.trim() !== '')
      .map(([cardId, value]) => {
        const card = cards.find(c => c.id === cardId);
        return {
          osNumber: currentOS,
          cardId,
          cardName: card?.name || 'N/A',
          value,
          responsible: currentResponsible,
          releaseDate,
          type: 'initial'
        };
      });

    try {
      const response = await fetch(`${API_URL}/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Falha ao salvar a liberação.');
      await fetchAllData();
      alert('Liberação salva com sucesso!');
      setCurrentOS('');
      setCurrentResponsible('');
      setReleaseData({});
      setCurrentView('released');
    } catch (error) {
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

  const generateChecklist = () => {
    if (!checklistOS) return alert('Digite o número da OS!');
    const osReleases = releases.filter(r => r.osNumber === checklistOS);
    if (osReleases.length === 0) return alert('Nenhuma liberação encontrada para esta OS!');

    const items: ChecklistItem[] = osReleases.map(release => {
      const card = cards.find(c => c.id === release.cardId);
      return {
        item: release.cardName,
        code: release.value,
        responsible: release.responsible,
        releaseDate: release.releaseDate,
        isHeader: card?.includeInHeader || false,
      };
    });
    setChecklistData(items);
  };

  const copyChecklistToClipboard = () => {
    if (checklistData.length === 0) return;
    let text = `CHECKLIST - OS ${checklistOS}\n\n`;
    
    const headerItems = checklistData.filter(item => item.isHeader);
    const regularItems = checklistData.filter(item => !item.isHeader);

    if (headerItems.length > 0) {
      text += "=== ITENS PRINCIPAIS ===\n";
      headerItems.forEach(item => {
        text += `${item.item}: ${item.code}\n`;
      });
      text += "\n";
    }

    if (regularItems.length > 0) {
      text += "=== DEMAIS ITENS ===\n";
      regularItems.forEach(item => {
        text += `${item.item}: ${item.code}\n`;
      });
    }
    
    navigator.clipboard.writeText(text);
    alert('Checklist copiado para a área de transferência!');
  };

  // ==================================
  // FUNÇÕES AUXILIARES
  // ==================================
  const addCard = () => setCards([...cards, { id: `temp-${Date.now()}`, name: '', type: 'text', options: [], includeInHeader: false }]);
  const updateCard = (id: string, field: keyof CardConfig, value: any) => setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCard = (id: string) => setCards(cards.filter(c => c.id !== id));
  const addOptionToCard = (cardId: string) => {
    const newCards = cards.map(c => c.id === cardId ? { ...c, options: [...c.options, ''] } : c);
    setCards(newCards);
  };
  const updateCardOption = (cardId: string, optIndex: number, value: string) => {
    const newCards = cards.map(c => c.id === cardId ? { ...c, options: c.options.map((opt, i) => i === optIndex ? value : opt) } : c);
    setCards(newCards);
  };
  const removeCardOption = (cardId: string, optIndex: number) => {
    const newCards = cards.map(c => c.id === cardId ? { ...c, options: c.options.filter((_, i) => i !== optIndex) } : c);
    setCards(newCards);
  };

  // ==================================
  // RENDERIZAÇÃO
  // ==================================
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;

  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center"><CardTitle className="text-3xl font-bold text-gray-800 mb-2">Sistema de Engenharia</CardTitle><p className="text-gray-600">Liberação de Códigos</p></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setCurrentView('release')} className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">Iniciar</Button>
            <Button onClick={() => setShowAdmin(true)} variant="outline" className="w-full h-12 text-lg"><Settings className="mr-2 h-5 w-5" />Admin</Button>
          </CardContent>
        </Card>
        <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
          <DialogContent>
            <DialogHeader><DialogTitle>Acesso Administrativo</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4"><Label htmlFor="admin-password">Senha</Label><Input id="admin-password" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()} /></div>
            <DialogFooter><Button onClick={handleAdminAccess}>Entrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isAdminAuthenticated} onOpenChange={setIsAdminAuthenticated}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Painel Administrativo</DialogTitle></DialogHeader>
            <Tabs defaultValue="cards" className="py-4">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="cards">Configurar Cartões</TabsTrigger><TabsTrigger value="rules">Gerenciar Regras</TabsTrigger></TabsList>
              <TabsContent value="cards" className="space-y-6 pt-4">
                <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Configurar Cartões</h3><Button onClick={addCard}><Plus className="mr-2 h-4 w-4" />Adicionar Cartão</Button></div>
                {cards.map((card) => (
                  <Card key={card.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1"><Label>Nome do Cartão</Label><Input value={card.name} onChange={(e) => updateCard(card.id, 'name', e.target.value)} /></div>
                        <div><Label>Tipo</Label><Select value={card.type} onValueChange={(v: 'text' | 'dropdown') => updateCard(card.id, 'type', v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Texto</SelectItem><SelectItem value="dropdown">Lista Suspensa</SelectItem></SelectContent></Select></div>
                        <div className="flex items-center space-x-2 pt-6"><Checkbox id={`header-${card.id}`} checked={card.includeInHeader} onCheckedChange={(checked) => updateCard(card.id, 'includeInHeader', !!checked)} /><Label htmlFor={`header-${card.id}`} className="text-sm font-medium">Inserir no cabeçalho?</Label></div>
                        <Button onClick={() => removeCard(card.id)} variant="destructive" size="icon" className="self-end"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      {card.type === 'dropdown' && <div className="space-y-2 pt-4 border-t"><div className="flex justify-between items-center mb-2"><Label>Opções da Lista</Label><Button onClick={() => addOptionToCard(card.id)} size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" />Opção</Button></div>{card.options.map((opt, i) => <div key={i} className="flex gap-2"><Input value={opt} onChange={(e) => updateCardOption(card.id, i, e.target.value)} /><Button onClick={() => removeCardOption(card.id, i)} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
                    </div>
                  </Card>
                ))}
                <DialogFooter><Button type="button" onClick={handleSaveCards} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar Cartões</>}</Button></DialogFooter>
              </TabsContent>
              <TabsContent value="rules" className="space-y-6 pt-4">
                <div className="flex justify-between items-center"><h3 className="text-lg font-semibold">Regras Condicionais</h3><Button onClick={() => setRules([...rules, { parent_card_id: '', parent_option_value: '', child_card_id: '', options: [] }])}><Plus className="mr-2 h-4 w-4" />Adicionar Nova Regra</Button></div>
                {rules.map((rule, index) => {
                  const childCard = cards.find(c => c.id === rule.child_card_id);
                  return (
                    <Card key={index} className="p-4 bg-gray-50">
                      <div className="flex justify-end mb-2"><Button onClick={() => setRules(rules.filter((_, i) => i !== index))} variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><Label>QUANDO no cartão (Pai)</Label><Select value={rule.parent_card_id} onValueChange={(v) => setRules(rules.map((r, i) => i === index ? { ...r, parent_card_id: v } : r))}><SelectTrigger><SelectValue placeholder="Selecione o pai..." /></SelectTrigger><SelectContent>{cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>o valor for</Label><Input value={rule.parent_option_value} placeholder="Digite o valor exato" onChange={(e) => setRules(rules.map((r, i) => i === index ? { ...r, parent_option_value: e.target.value } : r))} /></div>
                        <div><Label>ENTÃO o cartão (Filho)</Label><Select value={rule.child_card_id} onValueChange={(v) => setRules(rules.map((r, i) => i === index ? { ...r, child_card_id: v } : r))}><SelectTrigger><SelectValue placeholder="Selecione o filho..." /></SelectTrigger><SelectContent>{cards.filter(c => c.type === 'dropdown').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                      {childCard && <div className="mt-4"><Label>só poderá ter os valores:</Label><div className="p-4 border rounded-md bg-white grid grid-cols-2 md:grid-cols-4 gap-4 max-h-48 overflow-y-auto">{childCard.options.map((opt, optIndex) => <div key={optIndex} className="flex items-center space-x-2"><Checkbox id={`${index}-${optIndex}`} checked={rule.options.includes(opt)} onCheckedChange={(checked) => { const newOptions = checked ? [...rule.options, opt] : rule.options.filter(o => o !== opt); setRules(rules.map((r, i) => i === index ? { ...r, options: newOptions } : r)); }} /><label htmlFor={`${index}-${optIndex}`} className="text-sm font-medium leading-none">{opt}</label></div>)}</div></div>}
                    </Card>
                  )
                })}
                <DialogFooter><Button type="button" onClick={handleSaveRules} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar Todas as Regras</>}</Button></DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="mb-6 flex justify-between items-center"><h1 className="text-3xl font-bold text-gray-800">Sistema de Engenharia</h1><Button onClick={() => setCurrentView('home')} variant="outline">Voltar ao Início</Button></div>
        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="release">Liberação</TabsTrigger><TabsTrigger value="released">Liberados</TabsTrigger></TabsList>
          <TabsContent value="release" className="space-y-6 pt-4">
            <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>Número da OS</Label><Input value={currentOS} onChange={(e) => setCurrentOS(e.target.value)} /></div><div><Label>Responsável</Label><Input value={currentResponsible} onChange={(e) => setCurrentResponsible(e.target.value)} /></div></CardContent></Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => {
                const activeRules = rules.filter(r => r.child_card_id === card.id);
                let options = card.options;
                let isDisabled = false;
                if (activeRules.length > 0) {
                  const matchingRule = activeRules.find(r => releaseData[r.parent_card_id] === r.parent_option_value);
                  if (matchingRule) {
                    options = matchingRule.options;
                  } else {
                    const hasAnyParentValue = activeRules.some(r => releaseData[r.parent_card_id]);
                    if (hasAnyParentValue) {
                      isDisabled = true;
                      options = [];
                    }
                  }
                }
                const isDropdown = card.type === 'dropdown';
                return (
                  <Card key={card.id} className={isDisabled ? 'bg-gray-200' : ''}>
                    <CardHeader><CardTitle className="text-lg">{card.name}</CardTitle></CardHeader>
                    <CardContent>
                      {isDropdown ? <Select value={releaseData[card.id] || ''} onValueChange={(v) => setReleaseData({ ...releaseData, [card.id]: v })} disabled={isDisabled}><SelectTrigger><SelectValue placeholder={isDisabled ? "Bloqueado" : "Selecione..."} /></SelectTrigger><SelectContent>{options.map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}</SelectContent></Select> : <Input value={releaseData[card.id] || ''} onChange={(e) => setReleaseData({ ...releaseData, [card.id]: e.target.value })} />}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <div className="flex justify-center"><Button onClick={handleSaveRelease} disabled={isSaving} className="px-8 py-3 text-lg">{isSaving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Salvando...</> : <><Save className="mr-2 h-5 w-5" />Salvar Liberação</>}</Button></div>
          </TabsContent>
          <TabsContent value="released" className="space-y-6 pt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Códigos Liberados</h2>
              <Button onClick={() => setShowChecklistModal(true)}><FileText className="mr-2 h-4 w-4" />Gerar Checklist</Button>
            </div>
            <Card><CardContent className="p-4 overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-gray-50"><th className="text-left p-4 font-semibold">OS</th><th className="text-left p-4 font-semibold">Responsável</th><th className="text-left p-4 font-semibold">Data</th>{cards.map(c => <th key={c.id} className="text-left p-4 font-semibold">{c.name}</th>)}</tr></thead><tbody>{[...new Set(releases.map(r => r.osNumber))].map(os => { const osReleases = releases.filter(r => r.osNumber === os); const first = osReleases[0]; return <tr key={os} className="border-b hover:bg-gray-50"><td className="p-4 font-medium">{os}</td><td className="p-4">{first?.responsible}</td><td className="p-4">{first ? new Date(first.releaseDate).toLocaleDateString('pt-BR') : ''}</td>{cards.map(c => <td key={c.id} className="p-4">{osReleases.find(r => r.cardId === c.id)?.value || '-'}</td>)}</tr> })}</tbody></table></CardContent></Card>
          </TabsContent>
        </Tabs>

        {/* MODAL DO CHECKLIST RESTAURADO E MELHORADO */}
        <Dialog open={showChecklistModal} onOpenChange={setShowChecklistModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Gerar Checklist de Liberação</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-grow"><Label htmlFor="checklist-os">Número da OS</Label><Input id="checklist-os" value={checklistOS} onChange={(e) => setChecklistOS(e.target.value)} /></div>
                <Button onClick={generateChecklist}>Gerar</Button>
              </div>
              {checklistData.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Checklist para OS: {checklistOS}</h3>
                    <Button variant="outline" size="sm" onClick={copyChecklistToClipboard}><Copy className="mr-2 h-4 w-4" />Copiar</Button>
                  </div>
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    {checklistData.filter(item => item.isHeader).length > 0 && (
                      <div className="p-4 bg-blue-50 border-b">
                        <h4 className="font-bold text-blue-700 mb-2">ITENS PRINCIPAIS</h4>
                        <div className="space-y-1">
                          {checklistData.filter(item => item.isHeader).map((item, i) => <div key={i} className="flex justify-between"><span>{item.item}:</span><span className="font-mono bg-gray-200 px-2 rounded">{item.code}</span></div>)}
                        </div>
                      </div>
                    )}
                    {checklistData.filter(item => !item.isHeader).length > 0 && (
                      <div className="p-4">
                        <h4 className="font-bold text-gray-700 mb-2">DEMAIS ITENS</h4>
                        <div className="space-y-1">
                          {checklistData.filter(item => !item.isHeader).map((item, i) => <div key={i} className="flex justify-between"><span>{item.item}:</span><span className="font-mono bg-gray-200 px-2 rounded">{item.code}</span></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
