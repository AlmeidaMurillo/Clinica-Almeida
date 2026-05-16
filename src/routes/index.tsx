import { Outlet, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute, PublicRoute } from "../auth/ProtectedRoute";
import ScrollToTop from "../components/ScrollToTop/ScrollToTop";

/*

CADA PAGINA COM SEU ARQUIVO CSS,

LOGO CLICAVEL,

REMOVER O ARQUIVO VERCEL_DEPLOY

COLOCAR BOTOES DE REMOVER E EDITAR EM TODAS AS PAGINAS DE LISTAGEM, 
COM O MESMO ESTILO, E COLOCAR O MESMO ESTILO DE BOTAO DE ADICIONAR 
EM TODAS AS PAGINAS DE LISTAGEM

BUG, SE EU CRIAR UM AGENDAMENTO E CONFIRMAR ELE, 
SE EU CLICAR EM CONFIRMAR VARIAS VEZES ELE CRIA VARIAS CONSULTAS.

BUG NA CONSULTA, O MEDICO CONSEGUE FINALIZAR A CONSULTA SEM TER SIDO INICIADA, 
E CONSEGUE INICIAR ESTANDO FINALIZADA
E CONSEGUE FINALIZAR VARIAS VEZES, ESTANDO COM ELA EM ANDAMENTO
E QUERO COLOCAR UM BOTAO PARA CANCELAR A CONSULTA.

E QUERO QUE A TELA DE MEDICOS SEJA APENAS A TELA DE CONSULTAS, PERFIL, 
E AS QUE FOR NECESSARIAS
PARA ELE FAZER O SEU TRABALHO


*/

const Login = lazy(() => import("../pages/auth/login"));
const Dashboard = lazy(() => import("../pages/dashboard/dashboard"));
const Agendamentos = lazy(() => import("../pages/agendamentos/agendamentos"));
const Pacientes = lazy(() => import("../pages/pacientes/pacientes"));
const Consultas = lazy(() => import("../pages/consultas/consultas"));
const Prontuarios = lazy(() => import("../pages/prontuarios/prontuarios"));
const Medicos = lazy(() => import("../pages/medicos/medicos"));
const Servicos = lazy(() => import("../pages/servicos/servicos"));
const Convenios = lazy(() => import("../pages/convenios/convenios"));
const Usuarios = lazy(() => import("../pages/usuarios/usuarios"));

function ShellLayout() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <Outlet />
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<ShellLayout />}>
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/consultas" element={<Consultas />} />
            <Route path="/prontuarios" element={<Prontuarios />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["recepcao"]} />}>
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/medicos" element={<Medicos />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/convenios" element={<Convenios />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
