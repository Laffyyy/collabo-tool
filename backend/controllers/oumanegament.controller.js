const oumanegamentService = require('../services/oumanegament.service');

async function getOU(req, res, next) {
    try {
        const { howmany, page, sort } = req.body;
        const result = await oumanegamentService.getOU(howmany, page, sort);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function getDeactiveOU(req, res, next) {
    try {
        const { howmany, page, sort } = req.body;
        const result = await oumanegamentService.getDeactiveOU(howmany, page, sort);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function createOU(req, res, next) {
    try {
        const { name, description, parentouid, OUsettings } = req.body;
        const result = await oumanegamentService.createOU(name, description, parentouid, OUsettings);
        res.status(200).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}
