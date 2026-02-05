"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  RotateCcw,
  Settings,
  FileText,
  Tag,
  Plus,
  X,
} from "lucide-react";

const DEFAULT_SYSTEM_PROMPT = `Ты — AI агент службы поддержки. Ты помогаешь пользователям, отвечая на их вопросы по продуктам и услугам компании. Отвечай вежливо, кратко и по делу.

Если не можешь помочь пользователю или если пользователь просит связаться с живым оператором, перенаправь его на агента.

Формат ответа — JSON:
{
  "thinking": "Краткое объяснение хода рассуждений",
  "response": "Твой ответ пользователю",
  "user_mood": "positive|neutral|negative|curious|frustrated|confused",
  "suggested_questions": ["Вопрос 1?", "Вопрос 2?"],
  "debug": { "context_used": true|false },
  "matched_categories": ["category_id"],
  "redirect_to_agent": { "should_redirect": false, "reason": "" }
}`;

const DEFAULT_CATEGORIES = [
  { id: "account", name: "Аккаунт", keywords: ["аккаунт", "логин", "пароль", "регистрация", "профиль"] },
  { id: "billing", name: "Оплата", keywords: ["оплата", "счёт", "подписка", "тариф", "возврат"] },
  { id: "technical", name: "Техническая поддержка", keywords: ["ошибка", "баг", "не работает", "проблема"] },
  { id: "feature", name: "Функции", keywords: ["функция", "возможности", "как сделать"] },
  { id: "other", name: "Прочее", keywords: ["другое", "вопрос"] },
];

interface AgentConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enableCategories: boolean;
  enableMoodDetection: boolean;
  enableRedirectToAgent: boolean;
  enableSuggestedQuestions: boolean;
  categories: typeof DEFAULT_CATEGORIES;
}

const RightSidebar: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>({
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    model: "claude-sonnet-4-20250514",
    temperature: 0.3,
    maxTokens: 1000,
    enableCategories: true,
    enableMoodDetection: true,
    enableRedirectToAgent: true,
    enableSuggestedQuestions: true,
    categories: DEFAULT_CATEGORIES,
  });
  const [saved, setSaved] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    const savedConfig = localStorage.getItem("agent-config");
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("agent-config", JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent("agentConfigUpdated", { detail: config })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults: AgentConfig = {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      model: "claude-sonnet-4-20250514",
      temperature: 0.3,
      maxTokens: 1000,
      enableCategories: true,
      enableMoodDetection: true,
      enableRedirectToAgent: true,
      enableSuggestedQuestions: true,
      categories: DEFAULT_CATEGORIES,
    };
    setConfig(defaults);
    localStorage.setItem("agent-config", JSON.stringify(defaults));
    window.dispatchEvent(
      new CustomEvent("agentConfigUpdated", { detail: defaults })
    );
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const id = newCategoryName.toLowerCase().replace(/\s+/g, "_");
    setConfig((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        { id, name: newCategoryName.trim(), keywords: [] },
      ],
    }));
    setNewCategoryName("");
  };

  const removeCategory = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  };

  return (
    <aside className="w-[420px] pr-4 overflow-hidden pb-4">
      <Card className="h-full overflow-hidden flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium leading-none flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Настройки агента
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1">
          <Tabs defaultValue="prompt" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prompt" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Промпт
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Модель
              </TabsTrigger>
              <TabsTrigger value="categories" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                Категории
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt">Системный промпт</Label>
                <Textarea
                  id="system-prompt"
                  value={config.systemPrompt}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  className="min-h-[300px] text-xs font-mono"
                  placeholder="Введите системный промпт для агента..."
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="model">Модель</Label>
                <select
                  id="model"
                  value={config.model}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, model: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-haiku-4-5-20251001">Claude 4.5 Haiku</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {config.temperature}
                </Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens: {config.maxTokens}</Label>
                <input
                  id="max-tokens"
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={config.maxTokens}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Функции агента</h4>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-categories" className="text-xs">
                    Категоризация запросов
                  </Label>
                  <Switch
                    id="enable-categories"
                    checked={config.enableCategories}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableCategories: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-mood" className="text-xs">
                    Определение настроения
                  </Label>
                  <Switch
                    id="enable-mood"
                    checked={config.enableMoodDetection}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableMoodDetection: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-redirect" className="text-xs">
                    Перенаправление на оператора
                  </Label>
                  <Switch
                    id="enable-redirect"
                    checked={config.enableRedirectToAgent}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableRedirectToAgent: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-suggestions" className="text-xs">
                    Предложение вопросов
                  </Label>
                  <Switch
                    id="enable-suggestions"
                    checked={config.enableSuggestedQuestions}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        enableSuggestedQuestions: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Категории обращений</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Новая категория..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCategory();
                    }}
                  />
                  <Button size="sm" onClick={addCategory} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {config.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {category.name}
                      </span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {category.keywords.map((kw) => (
                          <Badge
                            key={kw}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCategory(category.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button onClick={handleSave} className="flex-1" size="sm">
              <Save className="w-4 h-4 mr-2" />
              {saved ? "Сохранено!" : "Сохранить"}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
};

export default RightSidebar;
