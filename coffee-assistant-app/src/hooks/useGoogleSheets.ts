import { useState, useCallback, useEffect } from 'react';
import type { BrewAttempt, Bean } from '../types/gemini';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export function useGoogleSheets() {
    const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken) {
            localStorage.setItem('google_access_token', accessToken);
        } else {
            localStorage.removeItem('google_access_token');
        }
    }, [accessToken]);

    const authenticate = useCallback((clientId: string) => {
        if (!clientId) {
            setError('Google Client ID is required');
            return;
        }

        const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error) {
                    setError(response.error);
                } else {
                    setAccessToken(response.access_token);
                    setError(null);
                }
            },
        });
        client.requestAccessToken();
    }, []);

    const fetchSheetsData = useCallback(async (spreadsheetId: string, range: string) => {
        if (!accessToken) throw new Error('Not authenticated');

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                setAccessToken(null);
                throw new Error('Unauthorized - please re-authenticate');
            }
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to fetch data');
        }

        return await response.json();
    }, [accessToken]);

    const ensureSheetsExist = useCallback(async (spreadsheetId: string) => {
        if (!accessToken) throw new Error('Not authenticated');

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                setAccessToken(null);
                throw new Error('Unauthorized - please re-authenticate');
            }
            throw new Error('Failed to fetch spreadsheet metadata. Make sure the ID is correct.');
        }

        const data = await response.json();
        const existingSheets = (data.sheets || []).map((s: any) => s.properties.title);

        const requiredSheets = ['Brews', 'Beans'];
        const sheetsToAdd = requiredSheets.filter(s => !existingSheets.includes(s));

        if (sheetsToAdd.length > 0) {
            const addResponse = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        requests: sheetsToAdd.map(title => ({
                            addSheet: { properties: { title } }
                        }))
                    }),
                }
            );
            if (!addResponse.ok) throw new Error('Failed to create required sheets "Brews" and "Beans"');
        }
    }, [accessToken]);

    const updateSheetsData = useCallback(async (spreadsheetId: string, range: string, values: any[][]) => {
        if (!accessToken) throw new Error('Not authenticated');

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values }),
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                setAccessToken(null);
                throw new Error('Unauthorized - please re-authenticate');
            }
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to update data');
        }

        return await response.json();
    }, [accessToken]);

    const backup = useCallback(async (spreadsheetId: string, logs: BrewAttempt[], beans: Bean[]) => {
        setIsLoading(true);
        setError(null);
        try {
            await ensureSheetsExist(spreadsheetId);

            // Backup Brews
            const brewHeaders = ['ID', 'Date', 'Brewer', 'BeanID', 'Grinder', 'Setting', 'Ratio', 'Temp', 'Technique', 'Extraction', 'Enjoyment'];
            const brewValues = [
                brewHeaders,
                ...logs.map(log => [
                    log.id,
                    log.date,
                    log.brewer,
                    log.beanId,
                    log.grinder || '',
                    log.grinderSetting || '',
                    log.ratio,
                    log.waterTemp,
                    log.technique || '',
                    log.extraction || '',
                    log.enjoyment || 0
                ])
            ];
            await updateSheetsData(spreadsheetId, 'Brews!A1', brewValues);

            // Backup Beans
            const beanHeaders = ['ID', 'Roastery', 'Name', 'Process', 'Origin', 'Varietal', 'Roast Level', 'Notes', 'URL', 'Roast Date'];
            const beanValues = [
                beanHeaders,
                ...beans.map(bean => [
                    bean.id,
                    bean.roastery,
                    bean.name,
                    bean.process || '',
                    bean.origin || '',
                    bean.varietal || '',
                    bean.roastLevel || '',
                    bean.notes || '',
                    bean.url || '',
                    bean.roastDate || ''
                ])
            ];
            await updateSheetsData(spreadsheetId, 'Beans!A1', beanValues);

            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [updateSheetsData]);

    const load = useCallback(async (spreadsheetId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await ensureSheetsExist(spreadsheetId);

            const brewsResp = await fetchSheetsData(spreadsheetId, 'Brews!A2:K1000');
            const beansResp = await fetchSheetsData(spreadsheetId, 'Beans!A2:J1000');

            const logs: BrewAttempt[] = (brewsResp.values || []).map((row: any[]) => ({
                id: row[0],
                date: row[1],
                brewer: row[2],
                beanId: row[3],
                grinder: row[4],
                grinderSetting: row[5],
                ratio: row[6],
                waterTemp: Number(row[7]),
                technique: row[8],
                extraction: row[9] ? Number(row[9]) : undefined,
                enjoyment: Number(row[10]),
            }));

            const beans: Bean[] = (beansResp.values || []).map((row: any[]) => ({
                id: row[0],
                roastery: row[1],
                name: row[2],
                process: row[3],
                origin: row[4],
                varietal: row[5],
                roastLevel: row[6],
                notes: row[7],
                url: row[8],
                roastDate: row[9],
            }));

            return { logs, beans };
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [fetchSheetsData]);

    return { authenticate, backup, load, accessToken, isLoading, error };
}
