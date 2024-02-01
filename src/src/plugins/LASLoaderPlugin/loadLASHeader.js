//import * as epsgCheck from 'epsg-index/all.json';

const headerBlockItems = [
    {item: 'FileSignature', format: 'char', size: 4},
    {item: 'FileSoureceID', format: 'uShort', size: 2},
    {item: 'GlobalEncoding', format: 'uShort', size: 2},
    {item: 'ProjectID1', format: 'notUsed', size: 4},
    {item: 'ProjectID2', format: 'notUsed', size: 2},
    {item: 'ProjectID3', format: 'notUsed', size: 2},
    {item: 'ProjectID4', format: 'notUsed', size: 8},
    {item: 'VersionMajor', format: 'uChar', size: 1},
    {item: 'VersionMinor', format: 'uChar', size: 1},
    {item: 'SystemIdentifier', format: 'char', size: 32},
    {item: 'GeneratingSoftware', format: 'char', size: 32},
    {item: 'CreationDay', format: 'uShort', size: 2},
    {item: 'CreationYear', format: 'uShort', size: 2},
    {item: 'HeaderSize', format: 'uShort', size: 2},
    {item: 'OffsetToPointData', format: 'uLong', size: 4},
    {item: 'NumberOfVariableLengthRecords', format: 'uLong', size: 4},
    {item: 'PointDataFormatID', format: 'uChar', size: 1},
    {item: 'PointDataRecordLength', format: 'uShort', size: 2},
    {item: 'NumberOfPoints', format: 'uLong', size: 4},
    {item: 'NumberOfPointByReturn', format: 'uLong', size: 20},
    {item: 'ScaleFactorX', format: 'double', size: 8},
    {item: 'ScaleFactorY', format: 'double', size: 8},
    {item: 'ScaleFactorZ', format: 'double', size: 8},
    {item: 'OffsetX', format: 'double', size: 8},
    {item: 'OffsetY', format: 'double', size: 8},
    {item: 'OffsetZ', format: 'double', size: 8},
    {item: 'MaxX', format: 'double', size: 8},
    {item: 'MinX', format: 'double', size: 8},
    {item: 'MaxY', format: 'double', size: 8},
    {item: 'MinY', format: 'double', size: 8},
    {item: 'MaxZ', format: 'double', size: 8},
    {item: 'MinZ', format: 'double', size: 8},
];

const variableLengthRecord = [
    {item: 'Reserved', format: 'uShort', size: 2},
    {item: 'UserId', format: 'char', size: 16},
    {item: 'RecordId', format: 'uShort', size: 2},
    {item: 'RecordLengthAfterHeader', format: 'uShort', size: 2},
    {item: 'Description', format: 'char', size: 32},
];

/**
 * @private
 * @param arrayBuffer
 * @returns {{}}
 */
export const loadLASHeader = (arrayBuffer) => {

    let currentByte = 0;
    let numOfVarLenRecords = 0;
    let projectionStart = 0;

    const dataView = new DataView(arrayBuffer);
    const buffer = new Uint8Array(6000);

    const getGeoKeys = (geoRecord) => {
        if (geoRecord === undefined) {
            return undefined;
        }
        const projectionEnd = projectionStart + geoRecord["RecordLengthAfterHeader"];
        const geoTag = buffer.slice(projectionStart, projectionEnd);
        const arrayBuffer = bufferFlipper(geoTag);
        const dataView = new DataView(arrayBuffer);
        let byteCount = 6;
        let numberOfKeys = Number(dataView.getUint16(byteCount, true));
        const geoKeys = [];
        while (numberOfKeys--) {
            const keyTmp = {};
            keyTmp.key = dataView.getUint16(byteCount += 2, true);
            keyTmp.tiffTagLocation = dataView.getUint16(byteCount += 2, true);
            keyTmp.count = dataView.getUint16(byteCount += 2, true);
            keyTmp.valueOffset = dataView.getUint16(byteCount += 2, true);
            geoKeys.push(keyTmp);
        }
        const projRecord = geoKeys.find(x => x.key === 3072);
        if (projRecord && projRecord.hasOwnProperty('valueOffset')) {
            const epsg = projRecord.valueOffset;
            if (validateEpsg(epsg)) {
                return epsg;
            }
            return undefined
        }
        return undefined;
    }

    const getValue = ({item, format, size}) => {
        let str, array;
        switch (format) {
            case 'char':
                array = new Uint8Array(arrayBuffer, currentByte, size);
                currentByte += size;
                str = uint8arrayToString(array);
                return [item, str];
            case 'uShort':
                str = dataView.getUint16(currentByte, true);
                currentByte += size;
                return [item, str];
            case 'uLong':
                str = dataView.getUint32(currentByte, true);
                if (item === 'NumberOfVariableLengthRecords') {
                    numOfVarLenRecords = str;
                }
                currentByte += size;
                return [item, str];
            case 'uChar':
                str = dataView.getUint8(currentByte);
                currentByte += size;
                return [item, str];
            case 'double':
                str = dataView.getFloat64(currentByte, true);
                currentByte += size;
                return [item, str];
            default:
                currentByte += size;
        }
    }

    const getValues = () => {
        const publicHeaderBlock = {};
        headerBlockItems.forEach((obj) => {
            const myObj = getValue({...obj});
            if (myObj !== undefined) {
                if (myObj[0] === 'FileSignature' && myObj[1] !== 'LASF') {
                    throw new Error('Ivalid FileSignature. Is this a LAS/LAZ file');
                }
                publicHeaderBlock[myObj[0]] = myObj[1];
            }
        });
        const variableRecords = [];
        let variableLengthRecords = numOfVarLenRecords;
        while (variableLengthRecords--) {
            const variableObj = {};
            variableLengthRecord.forEach((obj) => {
                const myObj = getValue({...obj});
                variableObj[myObj[0]] = myObj[1];
                if (myObj[0] === 'UserId' && myObj[1] === 'LASF_Projection') {
                    projectionStart = currentByte - 18 + 54;
                }
            });
            variableRecords.push(variableObj);
        }
        const geoRecord = variableRecords.find(x => x.UserId === 'LASF_Projection');
        const epsg = getGeoKeys(geoRecord);
        if (epsg) {
            publicHeaderBlock['epsg'] = epsg;
        }
        return publicHeaderBlock;
    }

    return getValues();
}

const validateEpsg = (epsg) => {
    return true;
    // if (epsgCheck[epsg.toString()]) {
    //     return true;
    // }
    // return false;
};

const bufferFlipper = (buf) => {
    let ab = new ArrayBuffer(buf.length);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
};

const uint8arrayToString = (array) => {
    let str = ''
    array.forEach((item) => {
        let c = String.fromCharCode(item);
        if (c !== '\u0000') {
            str += c;
        }
    });
    return str.trim();
};
