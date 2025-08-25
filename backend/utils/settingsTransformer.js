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
            
            // Broadcast Frontline settings
            if (broadcast.Frontline) {
                OUsettings.push({
                    settingstype: 'broadcast.frontline',
                    createBroadcasts: !!broadcast.Frontline.CreateBroadcasts,
                    replyToBroadcasts: !!broadcast.Frontline.ReplyToBroadcasts
                });
            }

            // Broadcast Support settings
            if (broadcast.support) {
                OUsettings.push({
                    settingstype: 'broadcast.support',
                    createBroadcasts: !!broadcast.support.CreateBroadcasts,
                    replyToBroadcasts: !!broadcast.support.ReplyToBroadcasts
                });
            }

            // Broadcast Supervisor settings
            if (broadcast.supervisor) {
                OUsettings.push({
                    settingstype: 'broadcast.supervisor',
                    createBroadcasts: !!broadcast.supervisor.CreateBroadcasts
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
                
                if (role === 'frontline') {
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
                
                if (role === 'frontline') {
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
 * Validates the Settings object structure
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

    // Validate Chat settings structure
    if (settings.Chat && typeof settings.Chat !== 'object') {
        result.isValid = false;
        result.errors.push('Settings.Chat must be an object');
    }

    // Validate broadcast settings structure
    if (settings.broadcast && typeof settings.broadcast !== 'object') {
        result.isValid = false;
        result.errors.push('Settings.broadcast must be an object');
    }

    return result;
}

module.exports = {
    transformSettingsToOUSettings,
    transformOUSettingsToSettings,
    validateSettings
};
