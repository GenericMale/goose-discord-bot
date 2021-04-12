export interface Interaction {
    id: string;
    type: InteractionType;
    data?: ApplicationCommandInteractionData;
    guild_id?: string;
    channel_id?: string;
    member?: InteractionGuildMember;
    user?: InteractionUser;
    token: string;
    version: number;
}

export enum InteractionType {
    Ping = 1,
    ApplicationCommand
}

export interface ApplicationCommandInteractionData {
    id: string;
    name: string;
    options?: ApplicationCommandInteractionDataOption[];
}

export interface ApplicationCommandInteractionDataOption {
    name: string;
    value?: string | number;
    options?: ApplicationCommandInteractionDataOption[];
}

export interface InteractionGuildMember {
    user?: InteractionUser;
    nick?: string;
    roles: string[];
    joined_at: string;
    premium_since?: string;
    deaf: boolean;
    mute: boolean;
    pending?: boolean;
    permissions?: string;
}

export interface InteractionUser {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    locale?: string;
    verified?: boolean;
    email?: string;
    flags?: number;
    premium_type?: number;
    public_flags?: number;
}

export enum InteractionResponseType {
    Pong = 1,
    Acknowledge,
    ChannelMessage,
    ChannelMessageWithSource,
    AcknowledgeWithSource
}