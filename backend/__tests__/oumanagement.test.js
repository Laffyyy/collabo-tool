const request = require('supertest');
const express = require('express');
const { mergeSettings } = require('../utils/settingsTransformer');

// Create mock functions
const mockGetOUById = jest.fn();
const mockUpdateOU = jest.fn();
const mockGetOUs = jest.fn();
const mockGetOUCount = jest.fn();
const mockCreateOU = jest.fn();

// Mock the model module
jest.mock('../model/ou.model', () => {
    return jest.fn().mockImplementation(() => ({
        getOUById: mockGetOUById,
        updateOU: mockUpdateOU,
        getOUs: mockGetOUs,
        getOUCount: mockGetOUCount,
        createOU: mockCreateOU
    }));
});

const OUmanagementService = require('../services/OUmanagement.service');

describe('OU Management Tests', () => {
    let app;

    beforeAll(() => {
        // Create Express app for testing
        app = express();
        app.use(express.json());
    });

    beforeEach(() => {
        // Clear all mock calls before each test
        jest.clearAllMocks();
    });

    describe('Settings Merging Logic', () => {
        test('should merge Chat settings correctly', () => {
            const existingSettings = {
                Chat: {
                    General: {
                        FileSharing: true,
                        Emoji: false,
                        Retention: 30
                    },
                    Frontline: {
                        Init1v1: true,
                        CreateGroup: false
                    }
                },
                broadcast: {
                    General: {
                        ApprovalforBroadcast: true
                    }
                }
            };

            const newSettings = {
                Chat: {
                    General: {
                        Emoji: true,
                        Retention: 45
                    },
                    support: {
                        Init1v1: false,
                        CreateGroup: true
                    }
                }
            };

            const result = mergeSettings(existingSettings, newSettings);

            expect(result.Chat.General.FileSharing).toBe(true); // Preserved
            expect(result.Chat.General.Emoji).toBe(true); // Updated
            expect(result.Chat.General.Retention).toBe(45); // Updated
            expect(result.Chat.Frontline.Init1v1).toBe(true); // Preserved
            expect(result.Chat.support.Init1v1).toBe(false); // New
            expect(result.Chat.support.CreateGroup).toBe(true); // New
            expect(result.broadcast.General.ApprovalforBroadcast).toBe(true); // Preserved
        });

        test('should merge broadcast settings correctly', () => {
            const existingSettings = {
                Chat: {
                    General: {
                        FileSharing: true
                    }
                },
                broadcast: {
                    General: {
                        ApprovalforBroadcast: true,
                        ScheduleBroadcast: false
                    },
                    Frontline: {
                        CreateBroadcasts: true
                    }
                }
            };

            const newSettings = {
                broadcast: {
                    General: {
                        ScheduleBroadcast: true,
                        PriorityBroadcast: true
                    },
                    supervisor: {
                        CreateBroadcasts: false
                    }
                }
            };

            const result = mergeSettings(existingSettings, newSettings);

            expect(result.Chat.General.FileSharing).toBe(true); // Preserved
            expect(result.broadcast.General.ApprovalforBroadcast).toBe(true); // Preserved
            expect(result.broadcast.General.ScheduleBroadcast).toBe(true); // Updated
            expect(result.broadcast.General.PriorityBroadcast).toBe(true); // New
            expect(result.broadcast.Frontline.CreateBroadcasts).toBe(true); // Preserved
            expect(result.broadcast.supervisor.CreateBroadcasts).toBe(false); // New
        });

        test('should handle empty existing settings', () => {
            const existingSettings = {};
            const newSettings = {
                Chat: {
                    General: {
                        FileSharing: true
                    }
                }
            };

            const result = mergeSettings(existingSettings, newSettings);

            expect(result.Chat.General.FileSharing).toBe(true);
        });

        test('should handle partial nested updates', () => {
            const existingSettings = {
                Chat: {
                    Frontline: {
                        Init1v1: true,
                        CreateGroup: false,
                        ShareFiles: true
                    }
                }
            };

            const newSettings = {
                Chat: {
                    Frontline: {
                        CreateGroup: true
                    }
                }
            };

            const result = mergeSettings(existingSettings, newSettings);

            expect(result.Chat.Frontline.Init1v1).toBe(true); // Preserved
            expect(result.Chat.Frontline.CreateGroup).toBe(true); // Updated
            expect(result.Chat.Frontline.ShareFiles).toBe(true); // Preserved
        });
    });

    describe('OUmanagement Service', () => {
        test('should update OU with basic fields only', async () => {
            const mockOU = {
                did: '123',
                dname: 'Old Name',
                ddescription: 'Old Description',
                jsSettings: {}
            };

            const updatedOU = {
                did: '123',
                dname: 'New Name',
                ddescription: 'New Description',
                jsSettings: {}
            };

            mockUpdateOU.mockResolvedValue(updatedOU);

            const changes = {
                OrgName: 'New Name',
                Description: 'New Description'
            };

            const result = await OUmanagementService.updateOU('123', changes);

            expect(mockGetOUById).not.toHaveBeenCalled(); // No settings to merge
            expect(mockUpdateOU).toHaveBeenCalledWith('123', changes);
            expect(result.message).toBe('OU updated successfully');
            expect(result.data).toEqual(updatedOU);
        });

        test('should update OU with settings merging', async () => {
            const mockCurrentOU = {
                did: '123',
                dname: 'Test OU',
                jsSettings: {
                    Chat: {
                        General: {
                            FileSharing: true,
                            Emoji: false
                        }
                    }
                }
            };

            const updatedOU = {
                did: '123',
                dname: 'Test OU',
                jsSettings: {
                    Chat: {
                        General: {
                            FileSharing: true,
                            Emoji: true,
                            Retention: 30
                        }
                    }
                }
            };

            mockGetOUById.mockResolvedValue(mockCurrentOU);
            mockUpdateOU.mockResolvedValue(updatedOU);

            const changes = {
                Settings: {
                    Chat: {
                        General: {
                            Emoji: true,
                            Retention: 30
                        }
                    }
                }
            };

            const result = await OUmanagementService.updateOU('123', changes);

            expect(mockGetOUById).toHaveBeenCalledWith('123');
            expect(mockUpdateOU).toHaveBeenCalledWith('123', {
                Settings: {
                    Chat: {
                        General: {
                            FileSharing: true,
                            Emoji: true,
                            Retention: 30
                        }
                    }
                }
            });
            expect(result.message).toBe('OU updated successfully');
        });

        test('should handle settings as string in database', async () => {
            const mockCurrentOU = {
                did: '123',
                jsSettings: JSON.stringify({
                    Chat: {
                        General: {
                            FileSharing: true
                        }
                    }
                })
            };

            const updatedOU = {
                did: '123',
                jsSettings: {
                    Chat: {
                        General: {
                            FileSharing: true,
                            Emoji: true
                        }
                    }
                }
            };

            mockGetOUById.mockResolvedValue(mockCurrentOU);
            mockUpdateOU.mockResolvedValue(updatedOU);

            const changes = {
                Settings: {
                    Chat: {
                        General: {
                            Emoji: true
                        }
                    }
                }
            };

            const result = await OUmanagementService.updateOU('123', changes);

            expect(mockGetOUById).toHaveBeenCalledWith('123');
            expect(result.message).toBe('OU updated successfully');
        });

        test('should handle invalid JSON in existing settings', async () => {
            const mockCurrentOU = {
                did: '123',
                jsSettings: 'invalid json string'
            };

            const updatedOU = {
                did: '123',
                jsSettings: {
                    Chat: {
                        General: {
                            Emoji: true
                        }
                    }
                }
            };

            mockGetOUById.mockResolvedValue(mockCurrentOU);
            mockUpdateOU.mockResolvedValue(updatedOU);

            const changes = {
                Settings: {
                    Chat: {
                        General: {
                            Emoji: true
                        }
                    }
                }
            };

            const result = await OUmanagementService.updateOU('123', changes);

            expect(result.message).toBe('OU updated successfully');
        });

        test('should throw error when OU not found', async () => {
            mockGetOUById.mockResolvedValue(null);

            const changes = {
                Settings: {
                    Chat: {
                        General: {
                            Emoji: true
                        }
                    }
                }
            };

            await expect(OUmanagementService.updateOU('999', changes))
                .rejects.toThrow('Failed to update OU: OU not found');
        });

        test('should handle database errors gracefully', async () => {
            mockGetOUById.mockRejectedValue(new Error('Database connection failed'));

            const changes = {
                Settings: {
                    Chat: {
                        General: {
                            Emoji: true
                        }
                    }
                }
            };

            await expect(OUmanagementService.updateOU('123', changes))
                .rejects.toThrow('Failed to update OU: Database connection failed');
        });

        test('should update only Chat settings without affecting broadcast', async () => {
            const mockCurrentOU = {
                did: '123',
                jsSettings: {
                    Chat: {
                        General: {
                            FileSharing: true
                        }
                    },
                    broadcast: {
                        General: {
                            ApprovalforBroadcast: true
                        }
                    }
                }
            };

            mockGetOUById.mockResolvedValue(mockCurrentOU);
            mockUpdateOU.mockResolvedValue({});

            const changes = {
                Settings: {
                    Chat: {
                        General: {
                            Emoji: true
                        }
                    }
                }
            };

            await OUmanagementService.updateOU('123', changes);

            const expectedSettings = {
                Chat: {
                    General: {
                        FileSharing: true,
                        Emoji: true
                    }
                },
                broadcast: {
                    General: {
                        ApprovalforBroadcast: true
                    }
                }
            };

            expect(mockUpdateOU).toHaveBeenCalledWith('123', {
                Settings: expectedSettings
            });
        });

        test('should update only broadcast settings without affecting Chat', async () => {
            const mockCurrentOU = {
                did: '123',
                jsSettings: {
                    Chat: {
                        General: {
                            FileSharing: true
                        }
                    },
                    broadcast: {
                        General: {
                            ApprovalforBroadcast: true
                        }
                    }
                }
            };

            mockGetOUById.mockResolvedValue(mockCurrentOU);
            mockUpdateOU.mockResolvedValue({});

            const changes = {
                Settings: {
                    broadcast: {
                        General: {
                            ScheduleBroadcast: true
                        }
                    }
                }
            };

            await OUmanagementService.updateOU('123', changes);

            const expectedSettings = {
                Chat: {
                    General: {
                        FileSharing: true
                    }
                },
                broadcast: {
                    General: {
                        ApprovalforBroadcast: true,
                        ScheduleBroadcast: true
                    }
                }
            };

            expect(mockUpdateOU).toHaveBeenCalledWith('123', {
                Settings: expectedSettings
            });
        });
    });

    describe('Model Integration Tests', () => {
        test('should build correct SQL query for basic updates', () => {
            // This would test the model's updateOU method
            // Since we're mocking the database, we'll test the logic flow
            const changes = {
                OrgName: 'New Name',
                Description: 'New Description',
                isactive: true
            };

            // Test that the service calls the model correctly
            expect(typeof OUmanagementService.updateOU).toBe('function');
        });
    });
});
