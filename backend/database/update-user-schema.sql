-- Migration script to update database schema to match the new structure
-- This script updates the existing tables to match the provided schema

-- First, let's ensure the tables exist with the correct structure

-- Update tblusers table to match the new schema
DO $$ 
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'dou') THEN
        ALTER TABLE tblusers ADD COLUMN dou character varying(100) NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'drole') THEN
        ALTER TABLE tblusers ADD COLUMN drole character varying(50) NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'dsupervisorid') THEN
        ALTER TABLE tblusers ADD COLUMN dsupervisorid uuid NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'dmanagerid') THEN
        ALTER TABLE tblusers ADD COLUMN dmanagerid uuid NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'dtype') THEN
        ALTER TABLE tblusers ADD COLUMN dtype character varying(20) NULL DEFAULT 'user';
    END IF;

    -- Update existing columns to match new constraints
    ALTER TABLE tblusers ALTER COLUMN daccountstatus SET DEFAULT 'active';
    
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tblusers_dsupervisorid_fkey') THEN
        ALTER TABLE tblusers ADD CONSTRAINT tblusers_dsupervisorid_fkey FOREIGN KEY (dsupervisorid) REFERENCES tblusers(did);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tblusers_dmanagerid_fkey') THEN
        ALTER TABLE tblusers ADD CONSTRAINT tblusers_dmanagerid_fkey FOREIGN KEY (dmanagerid) REFERENCES tblusers(did);
    END IF;

    -- Update check constraints
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tblusers_daccountstatus_check') THEN
        ALTER TABLE tblusers DROP CONSTRAINT tblusers_daccountstatus_check;
    END IF;
    
    ALTER TABLE tblusers ADD CONSTRAINT tblusers_daccountstatus_check CHECK (
        (daccountstatus)::text = ANY (
            ARRAY[
                'active'::character varying,
                'inactive'::character varying,
                'locked'::character varying,
                'deactivated'::character varying,
                'first-time'::character varying
            ]::text[]
        )
    );

    -- Add indexes for the new columns
    CREATE INDEX IF NOT EXISTS idx_users_ou ON tblusers (dou);
    CREATE INDEX IF NOT EXISTS idx_users_role ON tblusers (drole);
    CREATE INDEX IF NOT EXISTS idx_users_supervisor ON tblusers (dsupervisorid);
    CREATE INDEX IF NOT EXISTS idx_users_manager ON tblusers (dmanagerid);
    CREATE INDEX IF NOT EXISTS idx_users_type ON tblusers (dtype);

END $$;

-- Create default roles if they don't exist
INSERT INTO tblroles (dname, dhierarchylevel, dpermissions) 
VALUES 
    ('Admin', 5, '{"user_management": true, "system_admin": true, "broadcast": true, "chat_management": true}'),
    ('Manager', 4, '{"user_management": true, "team_management": true, "broadcast": true, "reports": true}'),
    ('Supervisor', 3, '{"team_management": true, "limited_user_management": true, "reports": true}'),
    ('Support', 2, '{"chat_support": true, "user_assistance": true}'),
    ('Frontline', 1, '{"basic_access": true}')
ON CONFLICT (dname) DO NOTHING;

-- Create default organizational units if they don't exist
INSERT INTO tblorganizationalunits (dname, ddescription, "jsSettings", "bisActive") 
VALUES 
    ('Engineering', 'Software Development and Engineering', '{}', true),
    ('Marketing', 'Marketing and Communications', '{}', true),
    ('Sales', 'Sales and Business Development', '{}', true),
    ('Support', 'Customer Support and Success', '{}', true),
    ('HR', 'Human Resources', '{}', true),
    ('Finance', 'Finance and Accounting', '{}', true),
    ('IT', 'Information Technology', '{}', true)
ON CONFLICT (dname) DO NOTHING;

-- Update existing users to have proper role assignments in tbluserroles
-- This is a one-time migration for existing users
DO $$
DECLARE
    user_record RECORD;
    role_id UUID;
    ou_id UUID;
BEGIN
    FOR user_record IN SELECT * FROM tblusers WHERE drole IS NOT NULL LOOP
        -- Get role ID
        SELECT did INTO role_id FROM tblroles WHERE dname = user_record.drole LIMIT 1;
        
        -- Get OU ID
        SELECT did INTO ou_id FROM tblorganizationalunits WHERE dname = user_record.dou LIMIT 1;
        
        -- Insert into tbluserroles if it doesn't exist
        INSERT INTO tbluserroles (duserid, droleid, douid, dsupervisorid, dmanagerid)
        VALUES (user_record.did, role_id, ou_id, user_record.dsupervisorid, user_record.dmanagerid)
        ON CONFLICT (duserid, droleid, douid) DO NOTHING;
    END LOOP;
END $$;

-- Create a function to automatically update role assignments when user data changes
CREATE OR REPLACE FUNCTION update_user_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
    role_id UUID;
    ou_id UUID;
BEGIN
    IF NEW.drole IS NOT NULL THEN
        -- Get role ID
        SELECT did INTO role_id FROM tblroles WHERE dname = NEW.drole LIMIT 1;
        
        -- Get OU ID if OU is specified
        IF NEW.dou IS NOT NULL THEN
            SELECT did INTO ou_id FROM tblorganizationalunits WHERE dname = NEW.dou LIMIT 1;
        END IF;
        
        -- Update or insert role assignment
        INSERT INTO tbluserroles (duserid, droleid, douid, dsupervisorid, dmanagerid)
        VALUES (NEW.did, role_id, ou_id, NEW.dsupervisorid, NEW.dmanagerid)
        ON CONFLICT (duserid, droleid, douid) DO UPDATE SET
            dsupervisorid = NEW.dsupervisorid,
            dmanagerid = NEW.dmanagerid;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain role assignments
DROP TRIGGER IF EXISTS trigger_update_user_role_assignment ON tblusers;
CREATE TRIGGER trigger_update_user_role_assignment
    AFTER INSERT OR UPDATE ON tblusers
    FOR EACH ROW
    EXECUTE FUNCTION update_user_role_assignment();

COMMIT;
