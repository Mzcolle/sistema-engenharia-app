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
import { Settings, Plus, Trash2, Save, FileText, Copy, Search } from "lucide-react";

// Tipos
interface CardConfig {
  id: string;
  name: string;
  type: 'text' | 'dropdown';
  options: string[];
  includeInHeader: boolean;
}

interface Release {
  id: string;
  osNumber: string;
  cardId: string;
  cardName: string;
  value: string;
  responsible: string;
  releaseDate: string;
  type: 'initial' | 'complementary' | 'additional';
  additionalNumber?: number;
}

interface ChecklistItem {
  item: string;
  code: string;
  responsible: string;
  releaseDate: string;
  type: 'initial' | 'complementary' | 'additional';
  additionalNumber?: number;
}

export default function EngineeringApp() {
  const [currentView, setCurrentView] = useState<'home' | 'release' | 'released'>('home');
  const [cards, setCards] = useState<CardConfig[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // Estados da tela de liberação
  const [currentOS, setCurrentOS] = useState('');
  const [currentResponsible, setCurrentResponsible] = useState('');
  const [releaseData, setReleaseData] = useState<Record<string, string>>({});
  const [showAdditionalCards, setShowAdditionalCards] = useState(false);
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({});
  
  // Estados da tela liberados
  const [searchOS, setSearchOS] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistOS, setChecklistOS] = useState('');
  const [checklistData, setChecklistData] = useState<ChecklistItem[]>([]);
  
  // Estados do modal de liberação adicional
  const [showAdditionalModal, setShowAdditionalModal] = useState(false);
  const [selectedOSForAdditional, setSelectedOSForAdditional] = useState('');
  const [existingReleases, setExistingReleases] = useState<Release[]>([]);

  // Carregar dados do localStorage
  useEffect(() => {
    const savedCards = localStorage.getItem("engineering-cards");
    const savedReleases = localStorage.getItem("engineering-releases");

    if (savedCards) setCards(JSON.parse(savedCards));
    if (savedReleases) setReleases(JSON.parse(savedReleases));
  }, []);

  // Salvar dados no localStorage
  useEffect(() => {
    localStorage.setItem("engineering-cards", JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem("engineering-releases", JSON.stringify(releases));
  }, [releases]);

  const handleAdminAccess = () => {
    if (adminPassword === 'eve123') {
      setIsAdminAuthenticated(true);
      setShowAdmin(false);
      setAdminPassword('');
    } else {
      alert('Senha incorreta!');
    }
  };

  const addCard = () => {
    const newCard: CardConfig = {
      id: Date.now().toString(),
      name: '',
      type: 'text',
      options: [],
      includeInHeader: false
    };
    setCards([...cards, newCard]);
  };

  const updateCard = (id: string, field: keyof CardConfig, value: any) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  const removeCard = (id: string) => {
    setCards(cards.filter(card => card.id !== id));
  };

  const addOptionToCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      updateCard(cardId, 'options', [...card.options, '']);
    }
  };

  const updateCardOption = (cardId: string, optionIndex: number, value: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const newOptions = [...card.options];
      newOptions[optionIndex] = value;
      updateCard(cardId, 'options', newOptions);
    }
  };

  const removeOptionFromCard = (cardId: string, optionIndex: number) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const newOptions = card.options.filter((_, index) => index !== optionIndex);
      updateCard(cardId, 'options', newOptions);
    }
  };

  const handleSaveRelease = () => {
    if (!currentOS || !currentResponsible) {
      alert('Preencha o número da OS e o responsável!');
      return;
    }

    const hasData = Object.values(releaseData).some(value => value.trim() !== '');
    if (!hasData) {
      alert('Preencha pelo menos um campo!');
      return;
    }

    // Verificar se OS já existe
    const existingOS = releases.find(r => r.osNumber === currentOS);
    if (existingOS) {
      const confirmAdditional = confirm('OS existente, deseja realizar uma liberação adicional?');
      if (confirmAdditional) {
        setShowAdditionalCards(true);
        return;
      } else {
        return;
      }
    }

    // Salvar liberação inicial
    const newReleases: Release[] = [];
    const releaseDate = new Date().toISOString();

    Object.entries(releaseData).forEach(([cardId, value]) => {
      if (value.trim()) {
        const card = cards.find(c => c.id === cardId);
        if (card) {
          newReleases.push({
            id: Date.now().toString() + Math.random(),
            osNumber: currentOS,
            cardId,
            cardName: card.name,
            value,
            responsible: currentResponsible,
            releaseDate,
            type: 'initial'
          });
        }
      }
    });

    setReleases([...releases, ...newReleases]);
    
    // Limpar formulário
    setCurrentOS('');
    setCurrentResponsible('');
    setReleaseData({});
    setCurrentView('released');
  };

  const handleSaveAdditionalRelease = () => {
    const hasData = Object.values(additionalData).some(value => value.trim() !== '');
    if (!hasData) {
      alert('Preencha pelo menos um campo adicional!');
      return;
    }

    const newReleases: Release[] = [];
    const releaseDate = new Date().toISOString();

    // Salvar dados adicionais (10 cartões)
    for (let i = 1; i <= 10; i++) {
      const value = additionalData[`adicional-${i}`];
      if (value && value.trim()) {
        newReleases.push({
          id: Date.now().toString() + Math.random(),
          osNumber: currentOS,
          cardId: `adicional-${i}`,
          cardName: `Adicional ${i}`,
          value,
          responsible: currentResponsible,
          releaseDate,
          type: 'additional',
          additionalNumber: i
        });
      }
    }

    setReleases([...releases, ...newReleases]);
    
    // Limpar formulário
    setCurrentOS('');
    setCurrentResponsible('');
    setReleaseData({});
    setAdditionalData({});
    setShowAdditionalCards(false);
    setCurrentView('released');
  };

  const handleAdditionalReleaseModal = () => {
    if (!selectedOSForAdditional) {
      alert('Selecione uma OS!');
      return;
    }

    const osReleases = releases.filter(r => r.osNumber === selectedOSForAdditional);
    if (osReleases.length === 0) {
      alert('OS não encontrada!');
      return;
    }

    setExistingReleases(osReleases);
    setCurrentOS(selectedOSForAdditional);
    setShowAdditionalModal(false);
    setShowAdditionalCards(true);
    setCurrentView('release');
  };

  const generateChecklist = () => {
    if (!checklistOS) {
      alert('Digite o número da OS!');
      return;
    }

    const osReleases = releases.filter(r => r.osNumber === checklistOS);
    if (osReleases.length === 0) {
      alert('Nenhuma liberação encontrada para esta OS!');
      return;
    }

    const checklistItems: ChecklistItem[] = osReleases.map(release => ({
      item: release.cardName,
      code: release.value,
      responsible: release.responsible,
      releaseDate: release.releaseDate,
      type: release.type,
      additionalNumber: release.additionalNumber
    }));

    setChecklistData(checklistItems);
  };

  const copyChecklist = () => {
    const headerItems = checklistData.filter(item => {
      const card = cards.find(c => c.name === item.item);
      return card?.includeInHeader;
    });

    const regularItems = checklistData.filter(item => {
      const card = cards.find(c => c.name === item.item);
      return !card?.includeInHeader;
    });

    let checklistText = `CHECKLIST - OS ${checklistOS}\n\n`;

    // Cabeçalho destacado
    if (headerItems.length > 0) {
      checklistText += "=== ITENS PRINCIPAIS ===\n";
      headerItems.forEach(item => {
        const typeIndicator = item.type === 'complementary' ? '[COMPLEMENTAR]' : item.type === 'additional' ? '[ADICIONAL]' : '[INICIAL]';
        const additionalText = item.type === 'additional' ? ` (${item.additionalNumber})` : '';
        checklistText += `${typeIndicator} ${item.item}${additionalText}: ${item.code} - ${item.responsible} - ${formatDate(item.releaseDate)}\n`;
      });
      checklistText += "\n";
    }

    // Separar por tipo
    const initialItems = regularItems.filter(item => item.type === 'initial');
    const complementaryItems = regularItems.filter(item => item.type === 'complementary');
    const additionalItems = regularItems.filter(item => item.type === 'additional');

    if (initialItems.length > 0) {
      checklistText += "=== LIBERAÇÕES INICIAIS ===\n";
      initialItems.forEach(item => {
        checklistText += `${item.item}: ${item.code} - ${item.responsible} - ${formatDate(item.releaseDate)}\n`;
      });
      checklistText += "\n";
    }

    if (complementaryItems.length > 0) {
      checklistText += "=== LIBERAÇÕES COMPLEMENTARES ===\n";
      complementaryItems.forEach(item => {
        checklistText += `${item.item}: ${item.code} - ${item.responsible} - ${formatDate(item.releaseDate)}\n`;
      });
      checklistText += "\n";
    }

    if (additionalItems.length > 0) {
      checklistText += "=== LIBERAÇÕES ADICIONAIS ===\n";
      additionalItems.forEach(item => {
        checklistText += `${item.item}: ${item.code} - ${item.responsible} - ${formatDate(item.releaseDate)}\n`;
      });
    }

    navigator.clipboard.writeText(checklistText);
    alert('Checklist copiado para a área de transferência!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getFilteredReleases = () => {
    if (!searchOS) return releases;
    return releases.filter(r => r.osNumber.toLowerCase().includes(searchOS.toLowerCase()));
  };

  const getTableData = () => {
    const filteredReleases = getFilteredReleases();
    const osNumbers = [...new Set(filteredReleases.map(r => r.osNumber))];
    
    return osNumbers.map(osNumber => {
      const osReleases = filteredReleases.filter(r => r.osNumber === osNumber);
      const row: Record<string, any> = { OS: osNumber };
      
      cards.forEach(card => {
        const cardReleases = osReleases.filter(r => r.cardId === card.id);
        if (cardReleases.length > 0) {
          row[card.name] = cardReleases.map(r => r.value).join(', ');
        } else {
          row[card.name] = '-';
        }
      });

      // Adicionar liberações adicionais
      const additionalReleases = osReleases.filter(r => r.type === 'additional');
      additionalReleases.forEach(r => {
        if (!row[r.cardName]) {
          row[r.cardName] = r.value;
        }
      });
      
      return row;
    });
  };

  const getAllColumns = () => {
    const cardColumns = cards.map(c => c.name);
    const additionalColumns = [...new Set(releases
      .filter(r => r.type === 'additional')
      .map(r => r.cardName)
    )];
    return [...cardColumns, ...additionalColumns];
  };

  // Tela inicial
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Sistema de Engenharia
            </CardTitle>
            <p className="text-gray-600">Liberação de Códigos</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setCurrentView('release')}
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Iniciar
            </Button>
            <Button 
              onClick={() => setShowAdmin(true)}
              variant="outline"
              className="w-full h-12 text-lg"
            >
              <Settings className="mr-2 h-5 w-5" />
              Admin
            </Button>
          </CardContent>
        </Card>

        {/* Modal de senha do admin */}
        <Dialog open={showAdmin} onOpenChange={setShowAdmin}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Acesso Administrativo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Digite a senha"
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdminAccess}>Entrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal do painel administrativo */}
        <Dialog open={isAdminAuthenticated} onOpenChange={setIsAdminAuthenticated}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Painel Administrativo</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Configurar Cartões</h3>
                <Button onClick={addCard}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Cartão
                </Button>
              </div>
              
              {cards.map((card) => (
                <Card key={card.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label>Nome do Cartão</Label>
                        <Input
                          value={card.name}
                          onChange={(e) => updateCard(card.id, 'name', e.target.value)}
                          placeholder="Ex: PATAMARES"
                        />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={card.type}
                          onValueChange={(value: 'text' | 'dropdown') => updateCard(card.id, 'type', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="dropdown">Lista Suspensa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={card.includeInHeader}
                          onCheckedChange={(checked) => updateCard(card.id, 'includeInHeader', checked)}
                        />
                        <Label className="text-sm">Inserir ao cabeçalho?</Label>
                      </div>
                      <Button
                        onClick={() => removeCard(card.id)}
                        variant="destructive"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {card.type === 'dropdown' && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Opções da Lista</Label>
                          <Button
                            onClick={() => addOptionToCard(card.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Opção
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {card.options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) => updateCardOption(card.id, index, e.target.value)}
                                placeholder="Digite a opção"
                              />
                              <Button
                                onClick={() => removeOptionFromCard(card.id, index)}
                                variant="destructive"
                                size="icon"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsAdminAuthenticated(false)}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistema de Engenharia</h1>
            <p className="text-gray-600">Gerenciamento de Liberação de Códigos</p>
          </div>
          <Button onClick={() => setCurrentView('home')} variant="outline">
            Voltar ao Início
          </Button>
        </div>

        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="release">Liberação</TabsTrigger>
            <TabsTrigger value="released">Liberados</TabsTrigger>
          </TabsList>

          <TabsContent value="release" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Nova Liberação</h2>
              <Button onClick={() => setShowAdditionalModal(true)} variant="outline">
                Liberação Adicional
              </Button>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número da OS</Label>
                    <Input
                      value={currentOS}
                      onChange={(e) => setCurrentOS(e.target.value)}
                      placeholder="Digite o número da OS"
                    />
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input
                      value={currentResponsible}
                      onChange={(e) => setCurrentResponsible(e.target.value)}
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!showAdditionalCards ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map((card) => (
                    <Card key={card.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{card.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {card.type === 'text' ? (
                          <Input
                            value={releaseData[card.id] || ''}
                            onChange={(e) => setReleaseData({...releaseData, [card.id]: e.target.value})}
                            placeholder="Digite o código"
                          />
                        ) : (
                          <Select
                            value={releaseData[card.id] || ''}
                            onValueChange={(value) => setReleaseData({...releaseData, [card.id]: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                              {card.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button onClick={handleSaveRelease} className="px-8 py-3 text-lg">
                    <Save className="mr-2 h-5 w-5" />
                    Salvar Liberação
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-orange-600">Liberação Adicional - OS {currentOS}</h3>
                  <p className="text-gray-600">Preencha os códigos adicionais para esta OS</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <Card key={num}>
                      <CardHeader>
                        <CardTitle className="text-lg">Adicional {num}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Input
                          value={additionalData[`adicional-${num}`] || ''}
                          onChange={(e) => setAdditionalData({...additionalData, [`adicional-${num}`]: e.target.value})}
                          placeholder="Digite o código adicional"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center space-x-4">
                  <Button onClick={() => setShowAdditionalCards(false)} variant="outline">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveAdditionalRelease} className="px-8 py-3 text-lg">
                    <Save className="mr-2 h-5 w-5" />
                    Salvar Liberação Adicional
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="released" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Códigos Liberados</h2>
              <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
                <DialogTrigger asChild>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Gerar Check-list
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerar Checklist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Número da OS</Label>
                      <Input
                        value={checklistOS}
                        onChange={(e) => setChecklistOS(e.target.value)}
                        placeholder="Digite o número da OS"
                      />
                    </div>
                    <Button onClick={generateChecklist}>Gerar</Button>
                    
                    {checklistData.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Checklist - OS {checklistOS}</h3>
                          <Button onClick={copyChecklist}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Checklist
                          </Button>
                        </div>
                        
                        <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                          {/* Itens do cabeçalho */}
                          {checklistData.filter(item => {
                            const card = cards.find(c => c.name === item.item);
                            return card?.includeInHeader;
                          }).length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-bold text-lg mb-2 text-blue-600">ITENS PRINCIPAIS</h4>
                              {checklistData.filter(item => {
                                const card = cards.find(c => c.name === item.item);
                                return card?.includeInHeader;
                              }).map((item, index) => (
                                <div key={index} className="mb-2 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                                  <div className="font-semibold text-lg">{item.item}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <strong>Código:</strong> {item.code} | <strong>Responsável:</strong> {item.responsible} | <strong>Data:</strong> {formatDate(item.releaseDate)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Itens</th>
                                  <th className="border border-gray-300 p-2 text-left">Códigos</th>
                                  <th className="border border-gray-300 p-2 text-left">Responsável</th>
                                  <th className="border border-gray-300 p-2 text-left">Data de Liberação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Liberações iniciais */}
                                {checklistData.filter(item => item.type === 'initial' && !cards.find(c => c.name === item.item)?.includeInHeader).map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 p-2">{item.item}</td>
                                    <td className="border border-gray-300 p-2">{item.code}</td>
                                    <td className="border border-gray-300 p-2">{item.responsible}</td>
                                    <td className="border border-gray-300 p-2">{formatDate(item.releaseDate)}</td>
                                  </tr>
                                ))}
                                
                                {/* Liberações complementares */}
                                {checklistData.filter(item => item.type === 'complementary').map((item, index) => (
                                  <tr key={index} className="hover:bg-green-50 bg-green-25">
                                    <td className="border border-gray-300 p-2">
                                      <span className="text-green-600 font-semibold">{item.item}</span>
                                    </td>
                                    <td className="border border-gray-300 p-2 text-green-600">{item.code}</td>
                                    <td className="border border-gray-300 p-2">{item.responsible}</td>
                                    <td className="border border-gray-300 p-2">{formatDate(item.releaseDate)}</td>
                                  </tr>
                                ))}
                                
                                {/* Liberações adicionais */}
                                {checklistData.filter(item => item.type === 'additional').map((item, index) => (
                                  <tr key={index} className="hover:bg-red-50 bg-red-25">
                                    <td className="border border-gray-300 p-2">
                                      <span className="text-red-600 font-semibold">{item.item}</span>
                                    </td>
                                    <td className="border border-gray-300 p-2 text-red-600">{item.code}</td>
                                    <td className="border border-gray-300 p-2">{item.responsible}</td>
                                    <td className="border border-gray-300 p-2">{formatDate(item.releaseDate)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      value={searchOS}
                      onChange={(e) => setSearchOS(e.target.value)}
                      placeholder="Buscar por OS..."
                      className="max-w-xs"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-semibold">OS</th>
                        {getAllColumns().map(column => (
                          <th key={column} className="text-left p-4 font-semibold">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getTableData().map((row, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{row.OS}</td>
                          {getAllColumns().map(column => (
                            <td key={column} className="p-4">
                              {row[column] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de liberação adicional */}
        <Dialog open={showAdditionalModal} onOpenChange={setShowAdditionalModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Liberação Adicional</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Selecionar OS</Label>
                <Select value={selectedOSForAdditional} onValueChange={setSelectedOSForAdditional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma OS" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(releases.map(r => r.osNumber))].map(osNumber => (
                      <SelectItem key={osNumber} value={osNumber}>
                        OS {osNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedOSForAdditional && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Liberações Existentes:</h4>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                    {releases
                      .filter(r => r.osNumber === selectedOSForAdditional)
                      .map((release, index) => (
                        <div key={index} className="text-sm py-1">
                          <span className="font-medium">{release.cardName}:</span> {release.value} 
                          <span className="text-gray-500 ml-2">({release.responsible})</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAdditionalReleaseModal}>Continuar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}