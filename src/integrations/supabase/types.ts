export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          ciclo: string
          consumidor_id: string
          criado_em: string
          id: string
          plano: Database["public"]["Enums"]["plano_consumidor"]
          proximo_pagamento: string | null
          status: Database["public"]["Enums"]["status_assinatura"]
          valor: number
          vinculo_id: string | null
        }
        Insert: {
          ciclo?: string
          consumidor_id: string
          criado_em?: string
          id?: string
          plano?: Database["public"]["Enums"]["plano_consumidor"]
          proximo_pagamento?: string | null
          status?: Database["public"]["Enums"]["status_assinatura"]
          valor?: number
          vinculo_id?: string | null
        }
        Update: {
          ciclo?: string
          consumidor_id?: string
          criado_em?: string
          id?: string
          plano?: Database["public"]["Enums"]["plano_consumidor"]
          proximo_pagamento?: string | null
          status?: Database["public"]["Enums"]["status_assinatura"]
          valor?: number
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "vinculos_profissional_paciente"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          assinatura_id: string | null
          competencia: string
          criado_em: string
          id: string
          percentual: number
          profissional_id: string
          status: Database["public"]["Enums"]["status_comissao"]
          valor: number
          vinculo_id: string
        }
        Insert: {
          assinatura_id?: string | null
          competencia: string
          criado_em?: string
          id?: string
          percentual?: number
          profissional_id: string
          status?: Database["public"]["Enums"]["status_comissao"]
          valor?: number
          vinculo_id: string
        }
        Update: {
          assinatura_id?: string | null
          competencia?: string
          criado_em?: string
          id?: string
          percentual?: number
          profissional_id?: string
          status?: Database["public"]["Enums"]["status_comissao"]
          valor?: number
          vinculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "vinculos_profissional_paciente"
            referencedColumns: ["id"]
          },
        ]
      }
      config_ia_profissional: {
        Row: {
          atualizado_em: string
          filosofia_texto: string
          profissional_id: string
          restricoes: Json
          tom_de_voz: string
        }
        Insert: {
          atualizado_em?: string
          filosofia_texto?: string
          profissional_id: string
          restricoes?: Json
          tom_de_voz?: string
        }
        Update: {
          atualizado_em?: string
          filosofia_texto?: string
          profissional_id?: string
          restricoes?: Json
          tom_de_voz?: string
        }
        Relationships: []
      }
      dados_locais: {
        Row: {
          atualizado_em: string
          chave: string
          usuario_id: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          chave: string
          usuario_id: string
          valor?: Json
        }
        Update: {
          atualizado_em?: string
          chave?: string
          usuario_id?: string
          valor?: Json
        }
        Relationships: []
      }
      perfis: {
        Row: {
          avatar_url: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          tipo_perfil: Database["public"]["Enums"]["tipo_perfil"]
        }
        Insert: {
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          tipo_perfil?: Database["public"]["Enums"]["tipo_perfil"]
        }
        Update: {
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo_perfil?: Database["public"]["Enums"]["tipo_perfil"]
        }
        Relationships: []
      }
      perfis_academia: {
        Row: {
          cnpj: string | null
          criado_em: string
          link_slug: string
          modelo: Database["public"]["Enums"]["modelo_academia"]
          nome_fantasia: string
          usuario_id: string
        }
        Insert: {
          cnpj?: string | null
          criado_em?: string
          link_slug: string
          modelo?: Database["public"]["Enums"]["modelo_academia"]
          nome_fantasia?: string
          usuario_id: string
        }
        Update: {
          cnpj?: string | null
          criado_em?: string
          link_slug?: string
          modelo?: Database["public"]["Enums"]["modelo_academia"]
          nome_fantasia?: string
          usuario_id?: string
        }
        Relationships: []
      }
      perfis_consumidor: {
        Row: {
          atualizado_em: string
          dados_onboarding: Json
          objetivo: string | null
          plano: Database["public"]["Enums"]["plano_consumidor"]
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          dados_onboarding?: Json
          objetivo?: string | null
          plano?: Database["public"]["Enums"]["plano_consumidor"]
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          dados_onboarding?: Json
          objetivo?: string | null
          plano?: Database["public"]["Enums"]["plano_consumidor"]
          usuario_id?: string
        }
        Relationships: []
      }
      perfis_profissional: {
        Row: {
          bio: string | null
          criado_em: string
          crn_cref: string | null
          especialidade: string | null
          foto_capa: string | null
          link_slug: string
          nivel_parceiro: Database["public"]["Enums"]["nivel_parceiro"]
          percentual_comissao: number
          tipo: Database["public"]["Enums"]["tipo_profissional"]
          usuario_id: string
        }
        Insert: {
          bio?: string | null
          criado_em?: string
          crn_cref?: string | null
          especialidade?: string | null
          foto_capa?: string | null
          link_slug: string
          nivel_parceiro?: Database["public"]["Enums"]["nivel_parceiro"]
          percentual_comissao?: number
          tipo?: Database["public"]["Enums"]["tipo_profissional"]
          usuario_id: string
        }
        Update: {
          bio?: string | null
          criado_em?: string
          crn_cref?: string | null
          especialidade?: string | null
          foto_capa?: string | null
          link_slug?: string
          nivel_parceiro?: Database["public"]["Enums"]["nivel_parceiro"]
          percentual_comissao?: number
          tipo?: Database["public"]["Enums"]["tipo_profissional"]
          usuario_id?: string
        }
        Relationships: []
      }
      solicitacoes_saque: {
        Row: {
          chave_pix: string | null
          criado_em: string
          id: string
          profissional_id: string
          status: Database["public"]["Enums"]["status_saque"]
          valor: number
        }
        Insert: {
          chave_pix?: string | null
          criado_em?: string
          id?: string
          profissional_id: string
          status?: Database["public"]["Enums"]["status_saque"]
          valor: number
        }
        Update: {
          chave_pix?: string | null
          criado_em?: string
          id?: string
          profissional_id?: string
          status?: Database["public"]["Enums"]["status_saque"]
          valor?: number
        }
        Relationships: []
      }
      sugestoes_mensagem: {
        Row: {
          contexto: string | null
          criado_em: string
          enviado_em: string | null
          id: string
          paciente_id: string
          profissional_id: string
          status: Database["public"]["Enums"]["status_sugestao"]
          texto_gerado: string
          tipo: Database["public"]["Enums"]["tipo_sugestao"]
        }
        Insert: {
          contexto?: string | null
          criado_em?: string
          enviado_em?: string | null
          id?: string
          paciente_id: string
          profissional_id: string
          status?: Database["public"]["Enums"]["status_sugestao"]
          texto_gerado: string
          tipo?: Database["public"]["Enums"]["tipo_sugestao"]
        }
        Update: {
          contexto?: string | null
          criado_em?: string
          enviado_em?: string | null
          id?: string
          paciente_id?: string
          profissional_id?: string
          status?: Database["public"]["Enums"]["status_sugestao"]
          texto_gerado?: string
          tipo?: Database["public"]["Enums"]["tipo_sugestao"]
        }
        Relationships: []
      }
      vinculos_profissional_paciente: {
        Row: {
          consentimento_em: string | null
          criado_em: string
          encerrado_em: string | null
          id: string
          origem: Database["public"]["Enums"]["origem_vinculo"]
          paciente_id: string
          profissional_id: string
          status: Database["public"]["Enums"]["status_vinculo"]
        }
        Insert: {
          consentimento_em?: string | null
          criado_em?: string
          encerrado_em?: string | null
          id?: string
          origem?: Database["public"]["Enums"]["origem_vinculo"]
          paciente_id: string
          profissional_id: string
          status?: Database["public"]["Enums"]["status_vinculo"]
        }
        Update: {
          consentimento_em?: string | null
          criado_em?: string
          encerrado_em?: string | null
          id?: string
          origem?: Database["public"]["Enums"]["origem_vinculo"]
          paciente_id?: string
          profissional_id?: string
          status?: Database["public"]["Enums"]["status_vinculo"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      meu_tipo_perfil: {
        Args: never
        Returns: Database["public"]["Enums"]["tipo_perfil"]
      }
      pode_ver_paciente: { Args: { _paciente: string }; Returns: boolean }
      profissional_publico: {
        Args: { _slug: string }
        Returns: {
          bio: string
          especialidade: string
          link_slug: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_profissional"]
        }[]
      }
    }
    Enums: {
      modelo_academia: "parceira" | "corporativa"
      nivel_parceiro: "bronze" | "prata" | "ouro" | "diamante"
      origem_vinculo: "link_convite" | "indicacao_manual"
      plano_consumidor: "gratuito" | "essencial" | "premium"
      status_assinatura: "ativa" | "cancelada" | "inadimplente"
      status_comissao: "pendente" | "pago" | "cancelado"
      status_saque: "solicitado" | "processando" | "pago" | "recusado"
      status_sugestao:
        | "pendente"
        | "editado"
        | "aprovado"
        | "enviado"
        | "descartado"
      status_vinculo: "ativo" | "pausado" | "encerrado"
      tipo_perfil:
        | "consumidor"
        | "nutricionista"
        | "personal"
        | "academia"
        | "admin"
      tipo_profissional: "nutricionista" | "personal"
      tipo_sugestao:
        | "meta_atingida"
        | "inatividade"
        | "marco_peso"
        | "boas_vindas"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      modelo_academia: ["parceira", "corporativa"],
      nivel_parceiro: ["bronze", "prata", "ouro", "diamante"],
      origem_vinculo: ["link_convite", "indicacao_manual"],
      plano_consumidor: ["gratuito", "essencial", "premium"],
      status_assinatura: ["ativa", "cancelada", "inadimplente"],
      status_comissao: ["pendente", "pago", "cancelado"],
      status_saque: ["solicitado", "processando", "pago", "recusado"],
      status_sugestao: [
        "pendente",
        "editado",
        "aprovado",
        "enviado",
        "descartado",
      ],
      status_vinculo: ["ativo", "pausado", "encerrado"],
      tipo_perfil: [
        "consumidor",
        "nutricionista",
        "personal",
        "academia",
        "admin",
      ],
      tipo_profissional: ["nutricionista", "personal"],
      tipo_sugestao: [
        "meta_atingida",
        "inatividade",
        "marco_peso",
        "boas_vindas",
        "outro",
      ],
    },
  },
} as const
