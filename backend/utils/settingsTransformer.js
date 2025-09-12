/**
 * Settings Transformer Utility
 * Converts Settings object structure to OUsettings array format
 */

/**
 * Transforms Settings object to OUsettings array
 * @param {Object} settings - The Settings object from request body
 * @returns {Array} OUsettings array formatted for database storage
 */
function transformSettingsToOUSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        return [];
    }

    const OUsettings = [];

    try {
        // Transform Chat settings
        if (settings.Chat) {
            const chat = settings.Chat;
            
            // Chat General settings
            if (chat.General) {
                OUsettings.push({
                    settingstype: 'chat.general',
                    fileSharing: !!chat.General.FileSharing,
                    emoji: !!chat.General.Emoji,
                    retention: chat.General.Retention ? parseInt(chat.General.Retention) : null
                });
            }
            
            // Chat Supervisor settings (first in array)
            if (chat.supervisor) {
                OUsettings.push({
                    settingstype: 'chat.supervisor',
                    shareFiles: !!chat.supervisor.ShareFiles,
                    createGroup: !!chat.supervisor.CreateGroup,
                    forwardMessage: !!chat.supervisor.ForwardMessage
                });
            }

            // Chat Support settings (second in array)
            if (chat.support) {
                OUsettings.push({
                    settingstype: 'chat.support',
                    init1v1: !!chat.support.Init1v1,
                    shareFiles: !!chat.support.ShareFiles,
                    createGroup: !!chat.support.CreateGroup,
                    forwardMessage: !!chat.support.ForwardMessage,
                    joinGroupChats: !!chat.support.JoinGroupChats
                });
            }

            // Chat Frontline settings (third in array)
            if (chat.Frontline) {
                OUsettings.push({
                    settingstype: 'chat.frontline',
                    init1v1: !!chat.Frontline.Init1v1,
                    shareFiles: !!chat.Frontline.ShareFiles,
                    createGroup: !!chat.Frontline.CreateGroup,
                    forwardMessage: !!chat.Frontline.ForwardMessage,
                    joinGroupChats: !!chat.Frontline.JoinGroupChats
                });
            }
        }

        // Transform Broadcast settings
        if (settings.broadcast) {
            const broadcast = settings.broadcast;
            
            // Broadcast General settings (support both General and general)
            const generalBroadcast = broadcast.General || broadcast.general;
            if (generalBroadcast) {
                OUsettings.push({
                    settingstype: 'broadcast.general',
                    approvalforBroadcast: !!(generalBroadcast.ApprovalforBroadcast || generalBroadcast.approvalforBroadcast),
                    scheduleBroadcast: !!(generalBroadcast.ScheduleBroadcast || generalBroadcast.scheduleBroadcast),
                    priorityBroadcast: !!(generalBroadcast.PriorityBroadcast || generalBroadcast.priorityBroadcast),
                    retention: (generalBroadcast.Retention || generalBroadcast.retention) ? parseInt(generalBroadcast.Retention || generalBroadcast.retention) : null
                });
            }
            
            // Broadcast Frontline settings (support both Frontline and frontline)
            const frontlineBroadcast = broadcast.Frontline || broadcast.frontline;
            if (frontlineBroadcast) {
                OUsettings.push({
                    settingstype: 'broadcast.frontline',
                    createBroadcasts: !!(frontlineBroadcast.CreateBroadcasts || frontlineBroadcast.createBroadcasts),
                    replyToBroadcasts: !!(frontlineBroadcast.ReplyToBroadcasts || frontlineBroadcast.replyToBroadcasts)
                });
            }

            // Broadcast Support settings
            if (broadcast.support) {
                OUsettings.push({
                    settingstype: 'broadcast.support',
                    createBroadcasts: !!(broadcast.support.CreateBroadcasts || broadcast.support.createBroadcasts),
                    replyToBroadcasts: !!(broadcast.support.ReplyToBroadcasts || broadcast.support.replyToBroadcasts)
                });
            }

            // Broadcast Supervisor settings
            if (broadcast.supervisor) {
                OUsettings.push({
                    settingstype: 'broadcast.supervisor',
                    createBroadcasts: !!(broadcast.supervisor.CreateBroadcasts || broadcast.supervisor.createBroadcasts)
                });
            }
        }

    } catch (error) {
        throw new Error(`Failed to transform settings: ${error.message}`);
    }

    return OUsettings;
}

/**
 * Transforms OUsettings array back to Settings object structure
 * @param {Array} ouSettings - The OUsettings array from database
 * @returns {Object} Settings object formatted for API response
 */
function transformOUSettingsToSettings(ouSettings) {
    if (!Array.isArray(ouSettings)) {
        return {};
    }

    const settings = {
        Chat: {},
        broadcast: {}
    };

    try {
        ouSettings.forEach(setting => {
            const { settingstype } = setting;
            
            if (settingstype.startsWith('chat.')) {
                const role = settingstype.replace('chat.', '');
                
                if (role === 'general') {
                    settings.Chat.General = {
                        FileSharing: !!setting.fileSharing,
                        Emoji: !!setting.emoji,
                        Retention: setting.retention || null
                    };
                } else if (role === 'frontline') {
                    settings.Chat.Frontline = {
                        Init1v1: !!setting.init1v1,
                        CreateGroup: !!setting.createGroup,
                        JoinGroupChats: !!setting.joinGroupChats,
                        ShareFiles: !!setting.shareFiles,
                        ForwardMessage: !!setting.forwardMessage
                    };
                } else if (role === 'support') {
                    settings.Chat.support = {
                        Init1v1: !!setting.init1v1,
                        CreateGroup: !!setting.createGroup,
                        JoinGroupChats: !!setting.joinGroupChats,
                        ShareFiles: !!setting.shareFiles,
                        ForwardMessage: !!setting.forwardMessage
                    };
                } else if (role === 'supervisor') {
                    settings.Chat.supervisor = {
                        CreateGroup: !!setting.createGroup,
                        ShareFiles: !!setting.shareFiles,
                        ForwardMessage: !!setting.forwardMessage
                    };
                }
            } else if (settingstype.startsWith('broadcast.')) {
                const role = settingstype.replace('broadcast.', '');
                
                if (role === 'general') {
                    settings.broadcast.General = {
                        ApprovalforBroadcast: !!setting.approvalforBroadcast,
                        ScheduleBroadcast: !!setting.scheduleBroadcast,
                        PriorityBroadcast: !!setting.priorityBroadcast,
                        Retention: setting.retention || null
                    };
                } else if (role === 'frontline') {
                    settings.broadcast.Frontline = {
                        CreateBroadcasts: !!setting.createBroadcasts,
                        ReplyToBroadcasts: !!setting.replyToBroadcasts
                    };
                } else if (role === 'support') {
                    settings.broadcast.support = {
                        CreateBroadcasts: !!setting.createBroadcasts,
                        ReplyToBroadcasts: !!setting.replyToBroadcasts
                    };
                } else if (role === 'supervisor') {
                    settings.broadcast.supervisor = {
                        CreateBroadcasts: !!setting.createBroadcasts
                    };
                }
            }
        });

    } catch (error) {
        throw new Error(`Failed to transform OU settings: ${error.message}`);
    }

    return settings;
}

/**
 * Validates the Settings object structure for creation (requires both Chat and broadcast)
 * @param {Object} settings - The Settings object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateSettings(settings) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!settings || typeof settings !== 'object') {
        result.isValid = false;
        result.errors.push('Settings must be a valid object');
        return result;
    }

    // Require Chat settings to be present and be an object
    if (!settings.Chat) {
        result.isValid = false;
        result.errors.push('Settings.Chat is required');
    } else if (typeof settings.Chat !== 'object') {
        result.isValid = false;
        result.errors.push('Settings.Chat must be an object');
    }

    // Require broadcast settings to be present and be an object
    if (!settings.broadcast) {
        result.isValid = false;
        result.errors.push('Settings.broadcast is required');
    } else if (typeof settings.broadcast !== 'object') {
        result.isValid = false;
        result.errors.push('Settings.broadcast must be an object');
    }

    return result;
}

/**
 * Validates the Settings object structure for updates (allows partial updates)
 * @param {Object} settings - The Settings object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateSettingsForUpdate(settings) {
    const result = {
        isValid: true,
        errors: []
    };

    if (!settings || typeof settings !== 'object') {
        result.isValid = false;
        result.errors.push('Settings must be a valid object');
        return result;
    }

    // Validate Chat settings structure if present
    if (settings.Chat && typeof settings.Chat !== 'object') {
        result.isValid = false;
        result.errors.push('Settings.Chat must be an object');
    }

    // Validate broadcast settings structure if present
    if (settings.broadcast && typeof settings.broadcast !== 'object') {
        result.isValid = false;
        result.errors.push('Settings.broadcast must be an object');
    }

    return result;
}

/**
 * Transforms Settings object to jsSettings array format
 * @param {Object} settings - The Settings object from request body
 * @returns {Array} jsSettings array formatted as requested
 */
function transformSettingsToJSSettings(settings) {
    if (!settings || typeof settings !== 'object') {
        return [];
    }

    const jsSettings = [];

    try {
        // Transform Chat settings
        if (settings.Chat) {
            const chatSettings = {
                chat: {}
            };

            // Add supervisor settings
            if (settings.Chat.supervisor) {
                chatSettings.chat.supervisor = {
                    shareFiles: !!settings.Chat.supervisor.ShareFiles,
                    createGroup: !!settings.Chat.supervisor.CreateGroup,
                    forwardMessage: !!settings.Chat.supervisor.ForwardMessage
                };
            }

            // Add support settings
            if (settings.Chat.support) {
                chatSettings.chat.support = {
                    init1v1: !!settings.Chat.support.Init1v1,
                    shareFiles: !!settings.Chat.support.ShareFiles,
                    createGroup: !!settings.Chat.support.CreateGroup,
                    forwardMessage: !!settings.Chat.support.ForwardMessage,
                    joinGroupChats: !!settings.Chat.support.JoinGroupChats
                };
            }

            // Add frontline settings
            if (settings.Chat.Frontline) {
                chatSettings.chat.frontline = {
                    init1v1: !!settings.Chat.Frontline.Init1v1,
                    shareFiles: !!settings.Chat.Frontline.ShareFiles,
                    createGroup: !!settings.Chat.Frontline.CreateGroup,
                    forwardMessage: !!settings.Chat.Frontline.ForwardMessage,
                    joinGroupChats: !!settings.Chat.Frontline.JoinGroupChats
                };
            }

            // Add general settings
            if (settings.Chat.General) {
                chatSettings.chat.general = {
                    fileSharing: !!settings.Chat.General.FileSharing,
                    emoji: !!settings.Chat.General.Emoji,
                    retention: settings.Chat.General.Retention ? parseInt(settings.Chat.General.Retention) : null
                };
            }

            jsSettings.push(chatSettings);
        }

        // Transform Broadcast settings
        if (settings.broadcast) {
            const broadcastSettings = {
                broadcast: {}
            };

            // Add supervisor settings
            if (settings.broadcast.supervisor) {
                broadcastSettings.broadcast.supervisor = {
                    createBroadcasts: !!(settings.broadcast.supervisor.CreateBroadcasts || settings.broadcast.supervisor.createBroadcasts)
                };
            }

            // Add support settings
            if (settings.broadcast.support) {
                broadcastSettings.broadcast.support = {
                    createBroadcasts: !!(settings.broadcast.support.CreateBroadcasts || settings.broadcast.support.createBroadcasts),
                    replyToBroadcasts: !!(settings.broadcast.support.ReplyToBroadcasts || settings.broadcast.support.replyToBroadcasts)
                };
            }

            // Add frontline settings (support both Frontline and frontline)
            const frontlineBroadcast = settings.broadcast.Frontline || settings.broadcast.frontline;
            if (frontlineBroadcast) {
                broadcastSettings.broadcast.frontline = {
                    createBroadcasts: !!(frontlineBroadcast.CreateBroadcasts || frontlineBroadcast.createBroadcasts),
                    replyToBroadcasts: !!(frontlineBroadcast.ReplyToBroadcasts || frontlineBroadcast.replyToBroadcasts)
                };
            }

            // Add general settings (support both General and general)
            const generalBroadcast = settings.broadcast.General || settings.broadcast.general;
            if (generalBroadcast) {
                broadcastSettings.broadcast.general = {
                    approvalforBroadcast: !!(generalBroadcast.ApprovalforBroadcast || generalBroadcast.approvalforBroadcast),
                    scheduleBroadcast: !!(generalBroadcast.ScheduleBroadcast || generalBroadcast.scheduleBroadcast),
                    priorityBroadcast: !!(generalBroadcast.PriorityBroadcast || generalBroadcast.priorityBroadcast),
                    retention: (generalBroadcast.Retention || generalBroadcast.retention) ? parseInt(generalBroadcast.Retention || generalBroadcast.retention) : null
                };
            }

            jsSettings.push(broadcastSettings);
        }

    } catch (error) {
        throw new Error(`Failed to transform settings to jsSettings: ${error.message}`);
    }

    return jsSettings;
}

/**
 * Merges new settings with existing settings, preserving existing data
 * @param {Object} existingSettings - Current settings from database
 * @param {Object} newSettings - New settings to merge in
 * @returns {Object} Merged settings object
 */
function mergeSettings(existingSettings, newSettings) {
    const merged = JSON.parse(JSON.stringify(existingSettings)); // Deep clone

    if (newSettings.Chat) {
        if (!merged.Chat) merged.Chat = {};
        
        // Merge Chat settings
        if (newSettings.Chat.Frontline) {
            if (!merged.Chat.Frontline) merged.Chat.Frontline = {};
            Object.assign(merged.Chat.Frontline, newSettings.Chat.Frontline);
        }
        
        if (newSettings.Chat.support) {
            if (!merged.Chat.support) merged.Chat.support = {};
            Object.assign(merged.Chat.support, newSettings.Chat.support);
        }
        
        if (newSettings.Chat.supervisor) {
            if (!merged.Chat.supervisor) merged.Chat.supervisor = {};
            Object.assign(merged.Chat.supervisor, newSettings.Chat.supervisor);
        }
        
        if (newSettings.Chat.General) {
            if (!merged.Chat.General) merged.Chat.General = {};
            Object.assign(merged.Chat.General, newSettings.Chat.General);
        }
    }

    if (newSettings.broadcast) {
        if (!merged.broadcast) merged.broadcast = {};
        
        // Merge broadcast settings
        if (newSettings.broadcast.Frontline) {
            if (!merged.broadcast.Frontline) merged.broadcast.Frontline = {};
            Object.assign(merged.broadcast.Frontline, newSettings.broadcast.Frontline);
        }
        
        if (newSettings.broadcast.support) {
            if (!merged.broadcast.support) merged.broadcast.support = {};
            Object.assign(merged.broadcast.support, newSettings.broadcast.support);
        }
        
        if (newSettings.broadcast.supervisor) {
            if (!merged.broadcast.supervisor) merged.broadcast.supervisor = {};
            Object.assign(merged.broadcast.supervisor, newSettings.broadcast.supervisor);
        }
        
        if (newSettings.broadcast.General) {
            if (!merged.broadcast.General) merged.broadcast.General = {};
            Object.assign(merged.broadcast.General, newSettings.broadcast.General);
        }
    }

    return merged;
}

module.exports = {
    transformSettingsToOUSettings,
    transformOUSettingsToSettings,
    validateSettings,
    validateSettingsForUpdate,
    transformSettingsToJSSettings,
    mergeSettings
};
