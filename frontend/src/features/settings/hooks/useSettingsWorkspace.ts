import { useEffect, useMemo, useState } from 'react';
import { createDefaultSettings, createSettingsId, loadSettings, saveSettings } from '../services/settingsRepository';
import type { SettingsProfession, SettingsState, SettingsTab, SettingsUser } from '../types/settings';

export const useSettingsWorkspace = () => {
  const [state, setState] = useState<SettingsState>(() => loadSettings());
  const [tab, setTab] = useState<SettingsTab>('recruitment');
  const [newProfession, setNewProfession] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => saveSettings(state), [state]);

  const activeProfessions = useMemo(() => state.professions.filter((item) => item.active), [state.professions]);

  const addProfession = () => {
    const name = newProfession.trim();
    if (!name || state.professions.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    setState((current) => ({ ...current, professions: [...current.professions, { id: createSettingsId('profession'), name, skills: [], active: true }] }));
    setNewProfession('');
  };

  const toggleProfession = (id: string) => {
    setState((current) => ({ ...current, professions: current.professions.map((item) => item.id === id ? { ...item, active: !item.active } : item) }));
  };

  const addSkill = (professionId: string) => {
    const skill = newSkill.trim();
    if (!skill) return;
    setState((current) => ({ ...current, professions: current.professions.map((item) => item.id === professionId && !item.skills.some((value) => value.toLowerCase() === skill.toLowerCase()) ? { ...item, skills: [...item.skills, skill] } : item) }));
    setNewSkill('');
  };

  const removeSkill = (professionId: string, skill: string) => {
    setState((current) => ({ ...current, professions: current.professions.map((item) => item.id === professionId ? { ...item, skills: item.skills.filter((value) => value !== skill) } : item) }));
  };

  const toggleTemplate = (id: string) => {
    setState((current) => ({ ...current, templates: current.templates.map((item) => item.id === id ? { ...item, active: !item.active } : item) }));
  };

  const toggleUser = (id: string) => {
    setState((current) => ({ ...current, users: current.users.map((item) => item.id === id ? { ...item, active: !item.active } : item) }));
  };

  const addRecruiter = () => {
    const name = newUserName.trim();
    const email = newUserEmail.trim();
    if (!name || !email) return;
    const user: SettingsUser = { id: createSettingsId('user'), name, email, role: 'recruiter', active: true };
    setState((current) => ({ ...current, users: [...current.users, user] }));
    setNewUserName('');
    setNewUserEmail('');
  };

  const resetDemo = () => setState(createDefaultSettings());

  return {
    state,
    tab,
    activeProfessions,
    inputs: { newProfession, newSkill, newUserName, newUserEmail },
    actions: {
      setTab,
      setNewProfession,
      setNewSkill,
      setNewUserName,
      setNewUserEmail,
      addProfession,
      toggleProfession,
      addSkill,
      removeSkill,
      toggleTemplate,
      toggleUser,
      addRecruiter,
      resetDemo,
    },
  };
};
