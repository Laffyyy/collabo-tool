const oumanegamentService = require('../services/OUmanagement.service');

async function getOU(req, res, next) {
    try {
        const { howmany, page, sort } = req.query;
        const result = await oumanegamentService.getOU(howmany, page, sort);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function getDeactiveOU(req, res, next) {
    try {
        const { howmany, page, sort } = req.query;
        const result = await oumanegamentService.getDeactiveOU(howmany, page, sort);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function createOUmanager(req, res, next) {
    try {
        const { name, description, parentouid, OUsettings } = req.body;
        const result = await oumanegamentService.createOU(name, description, parentouid, OUsettings);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function deactiveOU(req, res, next) {
    try {
        const { id } = req.body;
        const result = await oumanegamentService.deactiveOU(id);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function updateOU(req, res, next) {
    try {
        const { id, name, description, parentouid, OUsettings } = req.body;
        const result = await oumanegamentService.updateOU(id, name, description, parentouid, OUsettings);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getOU,
    getDeactiveOU,
    createOUmanager,
    deactiveOU,
    updateOU
};
